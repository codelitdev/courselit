"use client";

import { useState } from "react";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoreHorizontal, Search, UserPlus } from "lucide-react";

// Mock data for students
const students = [
    {
        id: 1,
        name: "Alice Johnson",
        email: "alice@example.com",
        progress: 75,
        lastActive: "2023-05-15",
    },
    {
        id: 2,
        name: "Bob Smith",
        email: "bob@example.com",
        progress: 45,
        lastActive: "2023-05-14",
    },
    {
        id: 3,
        name: "Charlie Brown",
        email: "charlie@example.com",
        progress: 90,
        lastActive: "2023-05-16",
    },
    {
        id: 4,
        name: "Diana Ross",
        email: "diana@example.com",
        progress: 60,
        lastActive: "2023-05-13",
    },
    {
        id: 5,
        name: "Edward Norton",
        email: "edward@example.com",
        progress: 30,
        lastActive: "2023-05-12",
    },
];

export default function StudentsPage() {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredStudents = students.filter(
        (student) =>
            student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Students</h1>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Student
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            </div>

            <div className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                            <TableCell className="font-medium">
                                <div className="flex items-center space-x-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage
                                            src={`https://api.dicebear.com/6.x/initials/svg?seed=${student.name}`}
                                            alt={student.name}
                                        />
                                        <AvatarFallback>
                                            {student.name
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span>{student.name}</span>
                                </div>
                            </TableCell>
                            <TableCell>{student.email}</TableCell>
                            <TableCell>
                                <div className="flex items-center space-x-2">
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div
                                            className="bg-primary h-2.5 rounded-full"
                                            style={{
                                                width: `${student.progress}%`,
                                            }}
                                        ></div>
                                    </div>
                                    <span>{student.progress}%</span>
                                </div>
                            </TableCell>
                            <TableCell>{student.lastActive}</TableCell>
                            <TableCell>
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
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
