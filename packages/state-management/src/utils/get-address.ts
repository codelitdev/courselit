const getAddress = (host: string) => {
    return {
        backend: host,
        frontend: host,
    };
};

export default getAddress;
