import { NextRequest } from "next/server";
import { auth } from "@/auth";
import DomainModel, { Domain } from "@courselit/orm-models/dao/domain";
import User from "@courselit/orm-models/dao/user";
import Lesson from "@courselit/orm-models/dao/lesson";
import { isEnrolled } from "@/ui-lib/utils";
import { error } from "@/services/logger";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ lessonId: string }> },
) {
    const { lessonId } = await params;

    const domain = await DomainModel.findOne<Domain>({
        name: req.headers.get("domain"),
    });
    if (!domain) {
        return Response.json({ message: "Domain not found" }, { status: 404 });
    }

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
        return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findOne({
        email: session.user?.email,
        domain: domain._id,
        active: true,
    });
    if (!user) {
        return Response.json({ message: "User not found" }, { status: 404 });
    }

    const lesson = await Lesson.findOne({
        lessonId,
        domain: domain._id,
    });
    if (!lesson) {
        return Response.json({ message: "Lesson not found" }, { status: 404 });
    }

    const { courseId } = lesson;

    const enrolled = isEnrolled(courseId, user);
    if (!enrolled) {
        return Response.json(
            { message: "Enrollment required" },
            { status: 403 },
        );
    }

    const purchase = user.purchases.find((p: any) => p.courseId === courseId);
    if (!purchase) {
        return Response.json(
            { message: "Progress not found" },
            { status: 404 },
        );
    }

    const lessonScormData = purchase.scormData?.lessons?.[lessonId] || {};

    const result = lessonScormData.cmi
        ? lessonScormData
        : { cmi: lessonScormData };

    return Response.json(result);
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ lessonId: string }> },
) {
    const { lessonId } = await params;

    const domain = await DomainModel.findOne<Domain>({
        name: req.headers.get("domain"),
    });
    if (!domain) {
        return Response.json({ message: "Domain not found" }, { status: 404 });
    }

    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
        return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findOne({
        email: session.user?.email,
        domain: domain._id,
        active: true,
    });
    if (!user) {
        return Response.json({ message: "User not found" }, { status: 404 });
    }

    const lesson = await Lesson.findOne({
        lessonId,
        domain: domain._id,
    });
    if (!lesson) {
        return Response.json({ message: "Lesson not found" }, { status: 404 });
    }

    const { courseId } = lesson;

    const enrolled = isEnrolled(courseId, user);
    if (!enrolled) {
        return Response.json(
            { message: "Enrollment required" },
            { status: 403 },
        );
    }

    const body = await req.json();
    const { element, value, updates } = body;

    // Support both single update and batch updates
    const updateEntries: [string, unknown][] = updates
        ? Object.entries(updates)
        : element
          ? [[element, value]]
          : [];

    if (updateEntries.length === 0) {
        return Response.json(
            { message: "No updates provided" },
            { status: 400 },
        );
    }

    try {
        const userDoc = await User.findById(user._id);
        if (!userDoc) {
            return Response.json(
                { message: "User not found" },
                { status: 404 },
            );
        }

        const purchase = userDoc.purchases.find(
            (p: any) => p.courseId === courseId,
        );
        if (!purchase) {
            return Response.json(
                { message: "Purchase not found" },
                { status: 404 },
            );
        }

        if (!purchase.scormData) {
            purchase.scormData = { lessons: {} };
        }
        if (!purchase.scormData.lessons) {
            purchase.scormData.lessons = {};
        }
        if (!purchase.scormData.lessons[lessonId]) {
            purchase.scormData.lessons[lessonId] = {};
        }

        // Apply all updates
        for (const [elem, val] of updateEntries) {
            setNestedValue(purchase.scormData.lessons[lessonId], elem, val);
        }

        userDoc.markModified("purchases");
        await userDoc.save();

        return Response.json({ success: true });
    } catch (err: any) {
        error(err.message, {
            stack: err.stack,
        });
        return Response.json(
            { message: "Failed to save runtime data" },
            { status: 500 },
        );
    }
}

// List of unsafe property keys that could lead to prototype pollution
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

// Sanitize key to prevent prototype pollution - returns null for unsafe keys
function sanitizePropertyKey(key: string): string | null {
    if (UNSAFE_KEYS.has(key)) {
        return null;
    }
    // Create a new string literal to break taint tracking
    return `${key}`;
}

function setNestedValue(obj: any, path: string, value: unknown): void {
    const parts = path.split(".");

    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const sanitizedPart = sanitizePropertyKey(parts[i]);
        if (sanitizedPart === null) {
            // Prevent prototype pollution by ignoring unsafe path segments
            return;
        }

        // Use Reflect API for safe property access
        const existing = Reflect.get(current, sanitizedPart);
        if (existing !== undefined && existing !== null) {
            current = existing;
        } else {
            const nextPart = parts[i + 1];
            // Use Object.create(null) to create objects without prototype chain
            const newObj = /^\d+$/.test(nextPart) ? [] : Object.create(null);
            Reflect.set(current, sanitizedPart, newObj);
            current = newObj;
        }
    }

    const sanitizedLastPart = sanitizePropertyKey(parts[parts.length - 1]);
    if (sanitizedLastPart === null) {
        // Prevent prototype pollution on final assignment
        return;
    }

    // Use Reflect.set for the final assignment
    Reflect.set(current, sanitizedLastPart, value);
}
