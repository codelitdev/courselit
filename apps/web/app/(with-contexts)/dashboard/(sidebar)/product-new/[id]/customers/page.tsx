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
// import {
//     DropdownMenu,
//     DropdownMenuContent,
//     DropdownMenuItem,
//     DropdownMenuLabel,
//     DropdownMenuSeparator,
//     DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, UserPlus } from "lucide-react";
import { useParams } from "next/navigation";
import { FetchBuilder } from "@courselit/utils";
import { AddressContext } from "@components/contexts";
import DashboardContent from "@components/admin/dashboard-content";
import {
    COURSE_CUSTOMERS_PAGE_HEADING,
    MANAGE_COURSES_PAGE_HEADING,
    PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER,
} from "@ui-config/strings";
import useProduct from "../product-hook";
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

interface Customer {
    userId: string;
    email: string;
    name: string;
    avatar: {
        thumbnail: string;
    };
    progress: string[];
    signedUpOn: number;
    lastAccessedOn: number;
}

export default function CustomersPage() {
    const params = useParams();
    const productId = params.id as string;
    const [customers, setCustomers] = useState<
        (Customer & { progressInPercentage?: number })[]
    >([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const address = useContext(AddressContext);
    const { product } = useProduct(productId, address);

    const breadcrumbs = [
        { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard/products" },
        {
            label: product ? truncate(product.title || "", 20) || "..." : "...",
            href: `/dashboard/product-new/${productId}`,
        },
        { label: COURSE_CUSTOMERS_PAGE_HEADING, href: "#" },
    ];

    const filteredCustomers = customers.filter(
        (customer) =>
            customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const fetchStudents = async () => {
        setLoading(true);
        const mutation = searchTerm
            ? `
            query {
                report: getReports(id: "${productId}") {
                    students (text: "${searchTerm}") {
                        email,
                        userId,
                        name,
                        progress,
                        signedUpOn,
                        lastAccessedOn,
                        downloaded,
                        avatar {
                            thumbnail
                        }
                    }
                }
            }
            `
            : `
            query {
                report: getReports(id: "${productId}") {
                    students {
                        email,
                        userId,
                        name,
                        progress,
                        signedUpOn,
                        lastAccessedOn,
                        downloaded,
                        avatar {
                            thumbnail
                        }
                    }
                }
            }
            `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(mutation)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            const response = await fetch.exec();
            setCustomers(
                response.report.students.map((student: any) => ({
                    ...student,
                    progressInPercentage: Math.round(
                        (student.progress.length /
                            (product?.lessons?.length || 0)) *
                            100,
                    ),
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

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Customers</h1>
                <Link href={`/dashboard/product-new/${productId}/customer/new`}>
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
                        <TableHead>Progress</TableHead>
                        <TableHead>Signed Up</TableHead>
                        <TableHead>Last Active</TableHead>
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
                        : filteredCustomers.map((customer) => (
                              <TableRow key={customer.email}>
                                  <TableCell className="font-medium">
                                      <Link
                                          href={`/dashboard/users/${customer.userId}`}
                                      >
                                          <div className="flex items-center space-x-2">
                                              <Avatar className="h-8 w-8">
                                                  <AvatarImage
                                                      src={
                                                          customer.avatar
                                                              ?.thumbnail
                                                      }
                                                      alt={customer.name}
                                                  />
                                                  <AvatarFallback>
                                                      {(
                                                          customer.name ||
                                                          customer.email
                                                      )
                                                          .split(" ")
                                                          .map((n) => n[0])
                                                          .join("")}
                                                  </AvatarFallback>
                                              </Avatar>
                                              <span>
                                                  {customer.name ||
                                                      customer.email}
                                              </span>
                                          </div>
                                      </Link>
                                  </TableCell>
                                  <TableCell>
                                      <div className="flex items-center space-x-2">
                                          <div className="w-20 bg-gray-200 rounded-full h-2.5">
                                              <div
                                                  className="bg-primary h-2.5 rounded-full"
                                                  style={{
                                                      width: `${customer.progressInPercentage}%`,
                                                  }}
                                              ></div>
                                          </div>
                                          <span>
                                              {customer.progressInPercentage}%
                                          </span>
                                          <Dialog>
                                              <DialogTrigger className="text-xs text-muted-foreground underline">
                                                  View
                                              </DialogTrigger>
                                              <DialogContent>
                                                  <DialogHeader>
                                                      <DialogTitle>
                                                          {customer.name ||
                                                              customer.email}
                                                          &apos;s Progress
                                                      </DialogTitle>
                                                  </DialogHeader>
                                                  <DialogDescription>
                                                      {/* {product?.lessons?.map((lesson: any) => (
                                                    <div key={lesson.lessonId}>
                                                        <h3>{lesson.title}</h3>
                                                    </div>
                                                ))} */}
                                                      {product?.lessons?.map(
                                                          (lesson: any) => (
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
                                                                      {customer.progress.includes(
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
                                  </TableCell>
                                  <TableCell>
                                      {formattedLocaleDate(customer.signedUpOn)}
                                  </TableCell>
                                  <TableCell>
                                      {formattedLocaleDate(
                                          customer.lastAccessedOn,
                                      )}
                                  </TableCell>
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
