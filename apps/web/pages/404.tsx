import BaseLayout from "../components/public/base-layout";
import { PAGE_TITLE_404 } from "../ui-config/strings";
import { getPage } from "../ui-lib/utils";
import { Address } from "@courselit/common-models";
import { useEffect, useState } from "react";
import { AppState } from "@courselit/state-management";
import { connect } from "react-redux";
import { Cross } from "@courselit/icons";

function Custom404({ address }: { address: Address }) {
    const [layout, setLayout] = useState([]);

    useEffect(() => {
        loadPage();
    }, []);
    const loadPage = async () => {
        const page = await getPage(`${address.backend}`);
        if (page) {
            setLayout(page.layout);
        }
    };

    return (
        <BaseLayout title={PAGE_TITLE_404} layout={layout}>
            <div className="flex flex-col gap-4 h-screen justify-center items-center mx-auto lg:max-w-[1200px] w-full">
                <Cross />
                <h1 className="text-4xl font-semibold my-4 lg:my-8">
                    {PAGE_TITLE_404}
                </h1>
            </div>
        </BaseLayout>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

export default connect(mapStateToProps)(Custom404);
