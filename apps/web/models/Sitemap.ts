import mongoose from 'mongoose';

const SitemapItemSchema = new mongoose.Schema({
  loc: {
    type: String,
    required: true,
  },
  lastmod: {
    type: String,
  },
});

const SitemapSchema = new mongoose.Schema({
  domain: {
    type: String,
    required: true,
    unique: true,
  },
  items: {
    type: [SitemapItemSchema],
    default: [
      { loc: '/' },
      { loc: '/products' },
      { loc: '/blog' },
    ],
  },
  publishLatestBlogs: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

export default mongoose.models.Sitemap || mongoose.model('Sitemap', SitemapSchema);
