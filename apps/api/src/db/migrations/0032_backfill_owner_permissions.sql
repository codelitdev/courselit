-- Owner memberships are full-access memberships. Keep rows created before
-- newer capabilities were added in sync with the current permission catalog.
UPDATE memberships
SET permissions = 'products:read,products:write,products:delete,learners:read,learners:write,school:admin,billing:read,media:read,media:write,media:delete,certificates:read,certificates:write,storefront:read,storefront:write,communities:read,communities:write,communities:moderate'
WHERE is_owner = true;
