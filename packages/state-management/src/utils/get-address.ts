const getAddress = (host: string) => {
  return {
    domain: host.split(":")[0],
    backend: host,
    frontend: `http://${host}`,
  };
};

export default getAddress;
