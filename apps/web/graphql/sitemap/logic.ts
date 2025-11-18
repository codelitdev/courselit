import Sitemap from '../../../models/Sitemap';

export const getSitemap = async (domain: string) => {
  let sitemap = await Sitemap.findOne({ domain });
  if (!sitemap) {
    sitemap = await Sitemap.create({ domain });
  }
  return sitemap;
};

export const updateSitemap = async (domain: string, items: any[], publishLatestBlogs: boolean) => {
  const sitemap = await Sitemap.findOneAndUpdate(
    { domain },
    { items, publishLatestBlogs },
    { new: true, upsert: true }
  );
  return sitemap;
};
