export default interface Media {
  id: string;
  originalFileName: string;
  file: string;
  mimeType: string;
  public: boolean;
  thumbnail?: string;
  caption?: string;
}