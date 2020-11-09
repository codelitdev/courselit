export default interface Course {
  id: string;
  title: string;
  featuredImage: string;
  cost: number;
  creatorName: string;
  slug: string;
  description: string;
  updated: Date;
  isFeatured: boolean;
  courseId: string;
}
