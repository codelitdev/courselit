interface FeaturedImage {
  thumbnail?: string;
  file?: string;
}

export default interface Course {
  id: string;
  title: string;
  featuredImage: FeaturedImage;
  cost: number;
  creatorName: string;
  slug: string;
  description: string;
  updatedAt: Date;
  isFeatured: boolean;
  courseId: string;
}
