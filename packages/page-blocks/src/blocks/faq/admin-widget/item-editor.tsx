import { useState } from "react";
import { Item } from "../settings";
import {
    TextEditor,
    Button,
    Form,
    FormField,
    Tooltip,
    AlertDescription,
    Alert,
} from "@courselit/components-library";
import { Address, Auth, Profile } from "@courselit/common-models";
import { AlertCircle } from "lucide-react";

interface ItemProps {
    item: Item;
    index: number;
    onChange: (newItemData: Item) => void;
    onDelete: () => void;
    address: Address;
    auth: Auth;
    profile: Profile;
}

export default function ItemEditor({
    item,
    onChange,
    onDelete,
    address,
}: ItemProps): JSX.Element {
    const [title, setTitle] = useState(item.title);
    const [description, setDescription] = useState(item.description);
    const [deleteConfirmation, setDeleteConfirmation] = useState(false);

    const itemChanged = () =>
        onChange({
            title,
            description,
        });

    return (
        <div className="flex flex-col">
            <Alert variant="destructive" className="mb-4">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                    Changes will be visible upon clicking Done button
                </AlertDescription>
            </Alert>
            <Form onSubmit={(e) => e.preventDefault()}>
                <FormField
                    label="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <div>
                    <p className="mb-1 font-medium">Description</p>
                    <TextEditor
                        initialContent={description}
                        onChange={(state: any) => setDescription(state)}
                        showToolbar={false}
                        url={address.backend}
                        mediaType="page"
                    />
                </div>
                <div className="flex justify-between">
                    <Tooltip title="Delete">
                        <Button
                            component="button"
                            onClick={() => {
                                if (deleteConfirmation) {
                                    onDelete();
                                } else {
                                    setDeleteConfirmation(true);
                                }
                            }}
                            variant="soft"
                        >
                            {deleteConfirmation ? "Sure?" : "Delete"}
                        </Button>
                    </Tooltip>
                    <Tooltip title="Go back">
                        <Button component="button" onClick={itemChanged}>
                            Done
                        </Button>
                    </Tooltip>
                </div>
            </Form>
        </div>
    );
}
