'use client';

import { gql, useQuery, useMutation } from '@apollo/client';
import { Button, Card, CardBody, CardHeader, Checkbox, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Input, Snippet } from '@nextui-org/react';
import { getAbsoluteUrl } from '@/__shared__/utils/url';
import { useEffect, useState } from 'react';

interface SitemapItem {
  loc: string;
  lastmod?: string;
}

interface Page {
  pageId: string;
  title: string;
}

const GET_SITEMAP = gql`
  query Sitemap($domain: String!) {
    sitemap(domain: $domain) {
      _id
      items {
        loc
        lastmod
      }
      publishLatestBlogs
    }
  }
`;

const UPDATE_SITEMAP = gql`
  mutation UpdateSitemap($domain: String!, $items: [SitemapItemInput!]!, $publishLatestBlogs: Boolean) {
    updateSitemap(domain: $domain, items: $items, publishLatestBlogs: $publishLatestBlogs) {
      _id
    }
  }
`;

const GET_PAGES = gql`
  query pages {
    getPages(type: site) {
      pageId
      title
    }
  }
`;

export default function SitemapEditor() {
  const [domain, setDomain] = useState('');
  const [items, setItems] = useState<SitemapItem[]>([]);
  const [publishLatestBlogs, setPublishLatestBlogs] = useState(false);

  useEffect(() => {
    setDomain(window.location.hostname);
  }, []);

  const { data, loading, refetch } = useQuery(GET_SITEMAP, {
    variables: { domain },
    skip: !domain,
  });

  useEffect(() => {
    if (data?.sitemap) {
      setItems(data.sitemap.items.map((item: SitemapItem) => ({ ...item })));
      setPublishLatestBlogs(data.sitemap.publishLatestBlogs);
    }
  }, [data]);

  const { data: pagesData } = useQuery(GET_PAGES);

  const [updateSitemap] = useMutation(UPDATE_SITEMAP);

  const handleAddItem = (page: Page | undefined) => {
    if (page) {
      setItems([...items, { loc: `/${page.pageId}`, lastmod: new Date().toISOString() }]);
    }
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSaveChanges = async () => {
    await updateSitemap({
      variables: {
        domain,
        items: items.map(item => ({ loc: item.loc, lastmod: item.lastmod })),
        publishLatestBlogs,
      },
    });
    refetch();
  };

  if (loading) return <p>Loading...</p>;

  return (
    <Card>
      <CardHeader>Sitemap Editor</CardHeader>
      <CardBody>
        <Snippet>
          {getAbsoluteUrl('/sitemap')}
        </Snippet>

        <div className="mt-4">
          {items.map((item, index) => (
            <div key={index} className="flex items-center justify-between mb-2">
              <Input
                value={item.loc}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[index].loc = e.target.value;
                  setItems(newItems);
                }}
              />
              <Button color="danger" onClick={() => handleRemoveItem(index)}>Remove</Button>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <Dropdown>
            <DropdownTrigger>
              <Button>Add Page</Button>
            </DropdownTrigger>
            <DropdownMenu onAction={(key) => handleAddItem(pagesData?.getPages.find((page: Page) => page.pageId === key))}>
              {pagesData?.getPages.map((page: Page) => (
                <DropdownItem key={page.pageId}>{page.title}</DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>
        </div>

        <div className="mt-4">
          <Checkbox
            isSelected={publishLatestBlogs}
            onValueChange={setPublishLatestBlogs}
          >
            Publish latest blogs to sitemap automatically
          </Checkbox>
        </div>

        <div className="mt-t-4">
          <Button color="primary" onClick={handleSaveChanges}>Save Changes</Button>
        </div>
      </CardBody>
    </Card>
  );
}
