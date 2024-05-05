import { Liquid } from "liquidjs";

const liquidEngine = new Liquid();

export default async function renderEmailContent(
    content: string,
    variables: Record<string, unknown>,
    template?: string,
): Promise<string> {
    let output = await liquidEngine.parseAndRender(content, variables);

    if (template) {
        output = await liquidEngine.parseAndRender(
            template,
            Object.assign({}, variables, {
                content: content,
            }),
        );
    }

    return output;
}
