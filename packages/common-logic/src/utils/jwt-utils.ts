import jsonwebtoken from "jsonwebtoken";

const jwtUtils = {
    generateToken(
        payload: object,
        secret: string,
        expiresIn: string | number = "1h",
    ): string {
        if (!secret) {
            throw new Error("JWT secret is required");
        }

        const options: jsonwebtoken.SignOptions = {
            expiresIn:
                typeof expiresIn === "number"
                    ? expiresIn
                    : (expiresIn as jsonwebtoken.SignOptions["expiresIn"]),
        };

        return jsonwebtoken.sign({ ...payload }, secret, options);
    },

    verifyToken(token: string, secret: string): object | null {
        if (!secret) {
            throw new Error("JWT secret is required");
        }

        return jsonwebtoken.verify(token, secret) as object | null;
    },
};

export default jwtUtils;
