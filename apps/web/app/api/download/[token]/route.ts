import DomainModel, { Domain } from "@courselit/orm-models/dao/domain";
import { NextRequest } from "next/server";
import DownloadLinkModel, {
    DownloadLink,
} from "@courselit/orm-models/dao/download-link";
import { responses } from "@config/strings";
import { error } from "@/services/logger";
import { Readable } from "node:stream";
import archiver from "archiver";
import UserModel from "@courselit/orm-models/dao/user";
import {
    Progress,
    Constants,
    Media,
    type User,
    type Course,
    type Lesson,
} from "@courselit/common-models";
import CourseModel from "@courselit/orm-models/dao/course";
import LessonModel from "@courselit/orm-models/dao/lesson";
import { getMedia } from "@/graphql/media/logic";
import {
    createReadStream,
    createWriteStream,
    existsSync,
    mkdirSync,
    rmSync,
    unlinkSync,
} from "fs";
import { recordActivity } from "@/lib/record-activity";
import path from "node:path";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ token: string }> },
) {
    const domain = await DomainModel.queryOne<Domain>({
        name: req.headers.get("domain"),
    });
    if (!domain) {
        return Response.json({ message: "Domain not found" }, { status: 404 });
    }

    const { token } = await params;
    if (!token) {
        return Response.json({ message: "Missing token" }, { status: 400 });
    }

    const downloadLink: DownloadLink | null = await DownloadLinkModel.queryOne({
        token,
        domain: domain._id,
        expiresAt: { $gt: new Date() },
    });
    if (!downloadLink) {
        return Response.json(
            { message: responses.item_not_found },
            { status: 404 },
        );
    }
    if (downloadLink.expiresAt.getTime() - Date.now() < 0) {
        await DownloadLinkModel.removeDoc(downloadLink as any);
        return Response.json(
            { message: responses.download_link_expired },
            { status: 404 },
        );
    }

    const course: Course | null = await CourseModel.queryOne({
        domain: domain._id,
        courseId: downloadLink.courseId,
        published: true,
    });
    if (!course) {
        return Response.json(
            { message: responses.item_not_found },
            { status: 404 },
        );
    }

    const allLessons: Lesson[] = await LessonModel.query(
        {
            courseId: course.courseId,
            domain: domain._id,
        },
        {
            media: 1,
        },
    );

    if (allLessons.length === 0) {
        return Response.json(
            { message: responses.digital_download_no_files },
            { status: 200 },
        );
    }

    const targetDirectory = `/tmp/${domain.name}/${(token as string).substr(
        0,
        16,
    )}-${Date.now()}`;
    const filesDirectory = "files";
    const targetDirectoryForFiles = `${targetDirectory}/${filesDirectory}`;

    try {
        createFolder(targetDirectory);
        createFolder(targetDirectoryForFiles);
        for (let lesson of allLessons) {
            try {
                const media = await getMedia(lesson.media);
                if (media && isDownloadableMedia(media)) {
                    await downloadFile(media, targetDirectoryForFiles);
                }
            } catch (err: any) {
                console.error(err.message);
            }
        }
        const zipFileAddress = await createArchive({
            targetDirectory,
            filesDirectory,
            archiveName: course.title,
        });

        const zipStream = createReadStream(zipFileAddress);
        const headers = new Headers({
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename=${course.title}.zip`,
        });

        const webStream = new ReadableStream({
            start(controller) {
                zipStream.on("data", (chunk) => controller.enqueue(chunk));
                zipStream.on("end", () => controller.close());
                zipStream.on("error", (err) => controller.error(err));
            },
        });

        zipStream.on("end", async () => {
            await recordProgress({
                courseId: downloadLink.courseId,
                userId: downloadLink.userId,
                domainId: downloadLink.domain,
            });
            downloadLink.consumed = true;
            await DownloadLinkModel.saveOne(downloadLink as any);
            rmSync(targetDirectory, { recursive: true, force: true });
        });

        return new Response(webStream, { headers });
    } catch (err: any) {
        error(err.message, {
            fileName: __filename,
            stack: err.stack,
        });
        return Response.json({ message: err.message }, { status: 500 });
    }
}

function createFolder(folderPath: string) {
    if (!existsSync(folderPath)) {
        mkdirSync(folderPath, { recursive: true });
    }
}

function isDownloadableMedia(media: Media | Partial<Media>): media is Media {
    return (
        typeof media.mediaId === "string" &&
        typeof media.originalFileName === "string" &&
        typeof media.file === "string"
    );
}

async function downloadFile(media: Media, folderPath: string) {
    const filePath = path.join(folderPath, media.originalFileName);

    try {
        const response: any = await fetch(media.file!);
        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
        }
        if (!response.body) {
            throw new Error("No response body received");
        }

        const blob = await response.blob();
        const readable = Readable.from(Buffer.from(await blob.arrayBuffer()));

        const fileStream = createWriteStream(filePath);
        await new Promise((resolve, reject) => {
            readable.pipe(fileStream);
            readable.on("error", (err: any) => {
                fileStream.close();
                unlinkSync(filePath);
                reject(err);
            });
            fileStream.on("finish", resolve);
        });
    } catch (err) {
        throw err;
    }
}

function createArchive({
    targetDirectory,
    filesDirectory,
    archiveName,
}: {
    targetDirectory: string;
    filesDirectory: string;
    archiveName: string;
}): Promise<string> {
    return new Promise((resolve, reject) => {
        const outputFileName = `${targetDirectory}/${archiveName}.zip`;
        const output = createWriteStream(outputFileName);
        const archive = archiver("zip", { zlib: { level: 9 } });
        output.on("close", () => {
            resolve(outputFileName);
        });
        archive.on("error", (err: any) => {
            reject(err.message);
        });
        archive.pipe(output);
        archive.directory(`${targetDirectory}/${filesDirectory}/`, false);
        archive.finalize();
    });
}

async function recordProgress({
    courseId,
    userId,
    domainId,
}: {
    courseId: string;
    userId: string;
    domainId: DownloadLink["domain"];
}) {
    const user: User | null = await UserModel.queryOne({ userId });
    if (!user) {
        return;
    }

    const enrolledItemIndex = user.purchases.findIndex(
        (progress: Progress) => progress.courseId === courseId,
    );

    if (enrolledItemIndex === -1) {
        return;
    }

    user.purchases[enrolledItemIndex].downloaded = true;
    await UserModel.saveOne(user as any);

    await recordActivity({
        domain: domainId,
        userId: user.userId,
        type: Constants.ActivityType.DOWNLOADED,
        entityId: courseId,
    });
}
