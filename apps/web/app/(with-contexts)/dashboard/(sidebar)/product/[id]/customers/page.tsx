"use client";

import { useContext, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, Copy } from "lucide-react";
import { useParams } from "next/navigation";
import { capitalize, FetchBuilder } from "@courselit/utils";
import { AddressContext } from "@components/contexts";
import DashboardContent from "@components/admin/dashboard-content";
import {
    COURSE_CUSTOMERS_PAGE_HEADING,
    MANAGE_COURSES_PAGE_HEADING,
    PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER,
} from "@ui-config/strings";
import useProduct from "@/hooks/use-product";
import { formattedLocaleDate, truncate } from "@ui-lib/utils";
import Link from "next/link";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@components/ui/dialog";
import { CheckCircled, Circle } from "@courselit/icons";
import { Skeleton } from "@components/ui/skeleton";
import {
    Constants,
    Progress,
    Membership,
    User,
} from "@courselit/common-models";
import { Tooltip, useToast, Badge } from "@courselit/components-library";
import { UIConstants } from "@courselit/common-models";
const { permissions } = UIConstants;

type Member = Pick<
    Membership,
    "status" | "subscriptionMethod" | "subscriptionId"
> &
    Partial<
        Pick<
            Progress,
            "completedLessons" | "createdAt" | "updatedAt" | "downloaded"
        >
    > & {
        progressInPercentage?: number;
        user: User;
    };

export default function CustomersPage() {
    const params = useParams();
    const productId = params.id as string;
    const [members, setMembers] = useState<Member[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const address = useContext(AddressContext);
    const { product } = useProduct(productId);
    const { toast } = useToast();

    const breadcrumbs = [
        { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard/products" },
        {
            label: product ? truncate(product.title || "", 20) || "..." : "...",
            href: `/dashboard/product/${productId}`,
        },
        { label: COURSE_CUSTOMERS_PAGE_HEADING, href: "#" },
    ];

    const filteredMembers = members.filter(
        (member) =>
            member.user.name
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            member.user.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const fetchStudents = async () => {
        setLoading(true);
        const mutation =
            // searchTerm
            // ? `
            // query {
            //     report: getReports(id: "${productId}") {
            //         students (text: "${searchTerm}") {
            //             email,
            //             userId,
            //             name,
            //             progress,
            //             signedUpOn,
            //             lastAccessedOn,
            //             downloaded,
            //             avatar {
            //                 thumbnail
            //             }
            //         }
            //     }
            // }
            // `
            // :
            `
            query GetMembers($productId: String!) {
                members: getProductMembers(courseId: $productId, limit: 10000000) {
                    user {
                        userId
                        avatar {
                            thumbnail
                        }
                        name
                        email
                    }
                    status
                    completedLessons
                    downloaded
                    subscriptionMethod
                    subscriptionId
                    createdAt
                    updatedAt
                }
            }
            `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({ query: mutation, variables: { productId } })
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            const response = await fetch.exec();
            setMembers(
                response.members.map((member: any) => ({
                    ...member,
                    progressInPercentage:
                        product?.type?.toLowerCase() ===
                            Constants.CourseType.COURSE &&
                        product?.lessons?.length! > 0
                            ? Math.round(
                                  ((member.completedLessons?.length || 0) /
                                      (product?.lessons?.length || 0)) *
                                      100,
                              )
                            : undefined,
                })),
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (product) {
            fetchStudents();
        }
    }, [product]);

    const handleCopyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Success",
            description: "Subscription ID is copied to clipboard",
        });
    };

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[
                permissions.manageAnyCourse,
                permissions.manageCourse,
            ]}
        >
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Customers</h1>
                <Link href={`/dashboard/product/${productId}/customer/new`}>
                    <Button variant="outline" size="sm">
                        <UserPlus className="mr-2 h-4 w-4" />
                        {PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER}
                    </Button>
                </Link>
            </div>

            {/* <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Students
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {students.length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Average Progress
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {Math.round(
                                students.reduce(
                                    (acc, student) => acc + student.progress,
                                    0,
                                ) / students.length,
                            )}
                            %
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Active Today
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {
                                students.filter(
                                    (student) =>
                                        student.lastActive ===
                                        new Date().toISOString().split("T")[0],
                                ).length
                            }
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Completion Rate
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {Math.round(
                                (students.filter(
                                    (student) => student.progress === 100,
                                ).length /
                                    students.length) *
                                    100,
                            )}
                            %
                        </div>
                    </CardContent>
                </Card>
            </div> */}

            <div className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>
                            {product?.type?.toLowerCase() ===
                            Constants.CourseType.COURSE
                                ? "Progress"
                                : "Downloaded"}
                        </TableHead>
                        <TableHead>Signed Up</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead>Subscription</TableHead>
                        {/* <TableHead>Actions</TableHead> */}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading
                        ? Array(5)
                              .fill(0)
                              .map((_, index) => (
                                  <TableRow key={index}>
                                      <TableCell>
                                          <div className="flex items-center space-x-2">
                                              <Skeleton className="h-8 w-8 rounded-full" />
                                              <Skeleton className="h-4 w-[200px]" />
                                          </div>
                                      </TableCell>
                                      <TableCell>
                                          <div className="flex items-center space-x-2">
                                              <Skeleton className="h-2.5 w-20" />
                                              <Skeleton className="h-4 w-8" />
                                          </div>
                                      </TableCell>
                                      <TableCell>
                                          <Skeleton className="h-4 w-[100px]" />
                                      </TableCell>
                                      <TableCell>
                                          <Skeleton className="h-4 w-[100px]" />
                                      </TableCell>
                                  </TableRow>
                              ))
                        : filteredMembers.map((member: Member) => (
                              <TableRow key={member.user.email}>
                                  <TableCell className="font-medium">
                                      <Link
                                          href={`/dashboard/users/${member.user.userId}`}
                                      >
                                          <div className="flex items-center space-x-2">
                                              <Avatar className="h-8 w-8">
                                                  <AvatarImage
                                                      src={
                                                          member.user.avatar
                                                              ?.thumbnail ||
                                                          "/courselit_backdrop_square.webp"
                                                      }
                                                      alt={
                                                          member.user.name ||
                                                          member.user.email
                                                      }
                                                  />
                                                  <AvatarFallback>
                                                      {(
                                                          member.user.name ||
                                                          member.user.email
                                                      ).charAt(0)}
                                                  </AvatarFallback>
                                              </Avatar>
                                              {/* <Avatar className="h-8 w-8">
                                                  <AvatarImage
                                                      src={
                                                          member.user.avatar
                                                              ?.thumbnail
                                                      }
                                                      alt={member.user.name}
                                                  />
                                                  <AvatarFallback>
                                                      {(
                                                          member.user.name ||
                                                          member.user.email
                                                      )
                                                          .split(" ")
                                                          .map((n) => n[0])
                                                          .join("")}
                                                  </AvatarFallback>
                                              </Avatar> */}
                                              <span>
                                                  {member.user.name ||
                                                      member.user.email}
                                              </span>
                                          </div>
                                      </Link>
                                  </TableCell>
                                  {/* <TableCell>
                                      {member.status}
                                  </TableCell> */}
                                  <TableCell>
                                      <div className="flex items-center space-x-2">
                                          <Badge
                                              variant={
                                                  member.status.toLowerCase() ===
                                                  "pending"
                                                      ? "secondary"
                                                      : member.status.toLowerCase() ===
                                                          "active"
                                                        ? "default"
                                                        : "destructive"
                                              }
                                          >
                                              {member.status
                                                  .charAt(0)
                                                  .toUpperCase() +
                                                  member.status.slice(1)}
                                          </Badge>
                                          {/* {member.user.userId !==
                                                    profile.userId && (
                                                    <Tooltip title="Change status">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                handleStatusChange(
                                                                    member,
                                                                )
                                                            }
                                                            disabled={
                                                                isUpdating
                                                            }
                                                        >
                                                            <RotateCcw className="h-3 w-3" />{" "}
                                                        </Button>
                                                    </Tooltip>
                                                )} */}
                                      </div>
                                  </TableCell>
                                  <TableCell>
                                      {product?.type?.toLowerCase() ===
                                      Constants.CourseType.COURSE ? (
                                          <>
                                              {product?.lessons?.length! >
                                                  0 && (
                                                  <div className="flex items-center space-x-2">
                                                      <div className="w-20 bg-gray-200 rounded-full h-2.5">
                                                          <div
                                                              className="bg-primary h-2.5 rounded-full"
                                                              style={{
                                                                  width: `${member.progressInPercentage}%`,
                                                              }}
                                                          ></div>
                                                      </div>
                                                      <span>
                                                          {
                                                              member.progressInPercentage
                                                          }
                                                          %
                                                      </span>
                                                      <Dialog>
                                                          <DialogTrigger className="text-xs text-muted-foreground underline">
                                                              View
                                                          </DialogTrigger>
                                                          <DialogContent>
                                                              <DialogHeader>
                                                                  <DialogTitle>
                                                                      {truncate(
                                                                          member
                                                                              .user
                                                                              .name ||
                                                                              member
                                                                                  .user
                                                                                  .email,
                                                                          10,
                                                                      )}
                                                                      &apos;s
                                                                      Progress
                                                                  </DialogTitle>
                                                              </DialogHeader>
                                                              <DialogDescription className="max-h-[400px] overflow-y-scroll">
                                                                  {/* {product?.lessons?.map((lesson: any) => (
                                                    <div key={lesson.lessonId}>
                                                        <h3>{lesson.title}</h3>
                                                    </div>
                                                ))} */}
                                                                  {product?.lessons?.map(
                                                                      (
                                                                          lesson: any,
                                                                      ) => (
                                                                          <div
                                                                              key={
                                                                                  lesson.lessonId
                                                                              }
                                                                              className="flex justify-between items-center mb-1"
                                                                          >
                                                                              <p>
                                                                                  {
                                                                                      lesson.title
                                                                                  }
                                                                              </p>
                                                                              <span>
                                                                                  {member.completedLessons?.includes(
                                                                                      lesson.lessonId,
                                                                                  ) ? (
                                                                                      <CheckCircled />
                                                                                  ) : (
                                                                                      <Circle />
                                                                                  )}
                                                                              </span>
                                                                          </div>
                                                                      ),
                                                                  )}
                                                              </DialogDescription>
                                                          </DialogContent>
                                                      </Dialog>
                                                  </div>
                                              )}
                                          </>
                                      ) : (
                                          <div className="flex items-center space-x-2">
                                              {!!member.downloaded ? (
                                                  <CheckCircled />
                                              ) : (
                                                  <Circle />
                                              )}
                                          </div>
                                      )}
                                  </TableCell>
                                  <TableCell>
                                      {formattedLocaleDate(member.createdAt)}
                                  </TableCell>
                                  <TableCell>
                                      {formattedLocaleDate(member.updatedAt)}
                                  </TableCell>
                                  <TableCell>
                                      <div className="flex items-center gap-2">
                                          <Tooltip
                                              title={`Method: ${capitalize(member.subscriptionMethod || "")}`}
                                          >
                                              {member.subscriptionId
                                                  ? truncate(
                                                        member.subscriptionId,
                                                        10,
                                                    )
                                                  : "-"}
                                          </Tooltip>
                                          {member.subscriptionId && (
                                              <Tooltip title="Copy Subscription ID">
                                                  <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={() =>
                                                          handleCopyToClipboard(
                                                              member.subscriptionId ||
                                                                  "",
                                                          )
                                                      }
                                                  >
                                                      <Copy className="h-4 w-4" />
                                                  </Button>
                                              </Tooltip>
                                          )}
                                      </div>
                                  </TableCell>
                                  {/* <TableCell className="hidden xl:table-cell max-w-xs truncate">
                                      {capitalize(member.subscriptionMethod) ||
                                          "-"}
                                  </TableCell> */}
                                  {/* <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                className="h-8 w-8 p-0"
                                            >
                                                <span className="sr-only">
                                                    Open menu
                                                </span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>
                                                Actions
                                            </DropdownMenuLabel>
                                            <DropdownMenuItem>
                                                View details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>
                                                Send message
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive">
                                                Remove student
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell> */}
                              </TableRow>
                          ))}
                </TableBody>
            </Table>
        </DashboardContent>
    );
}
