export interface Comment {
    id: number;
    author: string;
    avatar: string;
    content: string;
    likes: number;
    hasLiked: boolean;
    time: string;
    replies: Comment[];
}

export interface Post {
    id: number;
    author: string;
    avatar: string;
    time: string;
    category: string;
    content: string;
    likes: number;
    comments: Comment[];
    isPinned: boolean;
    hasLiked: boolean;
    media?: {
        type: "image" | "video" | "gif";
        url: string;
    };
}

export const mockPosts: Post[] = [
    {
        id: 1,
        author: "John Doe",
        avatar: "/placeholder.svg",
        time: "2 hours ago",
        category: "Tips",
        content:
            "Just discovered a great productivity hack! Try the Pomodoro technique - 25 minutes of focused work followed by a 5-minute break. It's been a game-changer for me!",
        likes: 42,
        comments: [
            {
                id: 1,
                author: "Alice Johnson",
                avatar: "/placeholder.svg",
                content:
                    "That's a great tip! I've been using this technique for a while now, and it really helps me stay focused.",
                likes: 5,
                hasLiked: false,
                time: "1 hour ago",
                replies: [
                    {
                        id: 2,
                        author: "John Doe",
                        avatar: "/placeholder.svg",
                        content: "Glad you find it helpful too, Alice!",
                        likes: 2,
                        hasLiked: false,
                        time: "30 minutes ago",
                        replies: [],
                    },
                ],
            },
        ],
        isPinned: false,
        hasLiked: false,
        media: {
            type: "image",
            url: "/placeholder.svg?height=200&width=300",
        },
    },
    {
        id: 2,
        author: "Jane Smith",
        avatar: "/placeholder.svg",
        time: "5 hours ago",
        category: "Questions",
        content:
            "Has anyone here used React Server Components? I'm curious about the performance benefits and potential drawbacks. Would love to hear your experiences!",
        likes: 18,
        comments: [],
        isPinned: false,
        hasLiked: false,
        media: {
            type: "gif",
            url: "/placeholder.svg?height=200&width=300",
        },
    },
    {
        id: 3,
        author: "Alex Johnson",
        avatar: "/placeholder.svg",
        time: "1 day ago",
        category: "Announcements",
        content:
            "Exciting news! We're organizing a community meetup next month. It's a great opportunity to network and share knowledge. Stay tuned for more details!",
        likes: 89,
        comments: [],
        isPinned: false,
        hasLiked: false,
        media: {
            type: "video",
            url: "https://example.com/video.mp4",
        },
    },
];
