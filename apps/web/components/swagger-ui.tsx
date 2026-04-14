"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export function SwaggerUi() {
    return (
        <SwaggerUI
            url="/openapi.json"
            deepLinking
            displayRequestDuration
            docExpansion="none"
            defaultModelsExpandDepth={-1}
            persistAuthorization
        />
    );
}
