exports.generateFolderPaths = ({ uploadFolder, domainName }) => {
  const uploadRootFolderForDomain = `${uploadFolder}/${domainName}`;
  const uploadFolderForDomain = `${uploadRootFolderForDomain}/files`;
  const thumbFolderForDomain = `${uploadRootFolderForDomain}/thumbs`;
  return { uploadFolderForDomain, thumbFolderForDomain };
};
