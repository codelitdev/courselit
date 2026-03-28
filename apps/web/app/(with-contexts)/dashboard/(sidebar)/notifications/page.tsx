"use client";

import DashboardContent from "@components/admin/dashboard-content";
import { AddressContext, ProfileContext } from "@components/contexts";
import Resources from "@components/resources";
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card";
import { Checkbox, useToast } from "@courselit/components-library";
import {
    ActivityType,
    Constants,
    NotificationChannel,
} from "@courselit/common-models";
import { checkPermission, FetchBuilder } from "@courselit/utils";
import {
    LOADING,
    NOTIFICATION_SETTINGS_COLUMN_ACTIVITY,
    NOTIFICATION_SETTINGS_EMPTY_STATE,
    NOTIFICATION_SETTINGS_GROUP_COMMUNITY_MANAGEMENT,
    NOTIFICATION_SETTINGS_GROUP_GENERAL,
    NOTIFICATION_SETTINGS_GROUP_PRODUCT_MANAGEMENT,
    NOTIFICATION_SETTINGS_GROUP_USER_MANAGEMENT,
    NOTIFICATION_SETTINGS_PAGE_DESCRIPTION,
    NOTIFICATION_SETTINGS_PAGE_HEADER,
    NOTIFICATION_SETTINGS_RESOURCE_TEXT,
    TOAST_TITLE_ERROR,
} from "@ui-config/strings";
import {
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

const breadcrumbs = [{ label: NOTIFICATION_SETTINGS_PAGE_HEADER, href: "#" }];
const notificationChannels = Object.values(
    Constants.NotificationChannel,
) as NotificationChannel[];
const activityTypeEnumNameByValue = new Map<ActivityType, string>(
    Object.entries(Constants.ActivityType).map(([key, value]) => [
        value as ActivityType,
        key,
    ]),
);
const notificationChannelEnumNameByValue = new Map<NotificationChannel, string>(
    Object.entries(Constants.NotificationChannel).map(([key, value]) => [
        value as NotificationChannel,
        key,
    ]),
);
const permissionGroupOrder = [
    "",
    "course:manage_any",
    "user:manage",
    "community:manage",
] as const;
const permissionGroupLabels: Record<
    (typeof permissionGroupOrder)[number],
    string
> = {
    "": NOTIFICATION_SETTINGS_GROUP_GENERAL,
    "course:manage_any": NOTIFICATION_SETTINGS_GROUP_PRODUCT_MANAGEMENT,
    "user:manage": NOTIFICATION_SETTINGS_GROUP_USER_MANAGEMENT,
    "community:manage": NOTIFICATION_SETTINGS_GROUP_COMMUNITY_MANAGEMENT,
};

interface NotificationPreferenceState {
    activityType: ActivityType;
    channels: NotificationChannel[];
}

interface ActivityGroupData {
    label: string;
    preferences: NotificationPreferenceState[];
}

function isGeneralActivity(activityType: ActivityType): boolean {
    return Constants.ActivityPermissionMap[activityType] === "";
}

function isActivityAllowedForPermissions(
    activityType: ActivityType,
    permissions: string[],
): boolean {
    if (isGeneralActivity(activityType)) {
        return true;
    }

    const requiredPermission = Constants.ActivityPermissionMap[activityType];
    if (!requiredPermission) {
        return false;
    }

    return checkPermission(permissions, [requiredPermission]);
}

function getAllowedActivityTypesForPermissions(
    permissions: string[],
): ActivityType[] {
    return (Object.values(Constants.ActivityType) as ActivityType[])
        .filter((activityType) =>
            isActivityAllowedForPermissions(activityType, permissions),
        )
        .sort((a, b) => a.localeCompare(b));
}

function getDefaultChannelsForActivity(
    _activityType: ActivityType,
): NotificationChannel[] {
    return [];
}

function getDefaultPreferencesForPermissions(
    permissions: string[],
): NotificationPreferenceState[] {
    return getAllowedActivityTypesForPermissions(permissions).map(
        (activityType) => ({
            activityType,
            channels: getDefaultChannelsForActivity(activityType),
        }),
    );
}

function mergePersistedPreferences({
    defaults,
    persisted,
}: {
    defaults: NotificationPreferenceState[];
    persisted: NotificationPreferenceState[];
}): NotificationPreferenceState[] {
    const persistedByActivityType = new Map<
        ActivityType,
        NotificationChannel[]
    >(
        persisted.map((preference) => [
            preference.activityType,
            normalizeChannels(preference.channels),
        ]),
    );

    return defaults.map((preference) => ({
        activityType: preference.activityType,
        channels:
            persistedByActivityType.get(preference.activityType) ||
            preference.channels,
    }));
}

function prettifyToken(value: string): string {
    return value
        .split("_")
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
        .join(" ");
}

function normalizeChannels(
    channels: NotificationChannel[],
): NotificationChannel[] {
    const uniqueChannels = new Set(channels);
    return notificationChannels.filter((channel) =>
        uniqueChannels.has(channel),
    );
}

function areChannelsEqual(
    currentChannels: NotificationChannel[],
    nextChannels: NotificationChannel[],
): boolean {
    return (
        currentChannels.length === nextChannels.length &&
        currentChannels.every(
            (channel, index) => nextChannels[index] === channel,
        )
    );
}

function getUpdatedChannels({
    channels,
    channel,
    checked,
}: {
    channels: NotificationChannel[];
    channel: NotificationChannel;
    checked: boolean;
}): NotificationChannel[] {
    const updatedChannels = new Set(channels);

    if (checked) {
        updatedChannels.add(channel);
    } else {
        updatedChannels.delete(channel);
    }

    return normalizeChannels(Array.from(updatedChannels));
}

function ActivityRow({
    preference,
    isUpdating,
    onChannelToggle,
}: {
    preference: NotificationPreferenceState;
    isUpdating: boolean;
    onChannelToggle: (
        activityType: ActivityType,
        channel: NotificationChannel,
        checked: boolean,
    ) => Promise<void>;
}) {
    return (
        <tr className="border-t">
            <td className="py-3 pr-3">
                {prettifyToken(preference.activityType)}
            </td>
            {notificationChannels.map((channel) => (
                <td
                    key={`${preference.activityType}-${channel}`}
                    className="w-24 py-3"
                >
                    <div className="flex justify-center">
                        <Checkbox
                            checked={preference.channels.includes(channel)}
                            disabled={isUpdating}
                            onChange={(value: boolean | "indeterminate") =>
                                onChannelToggle(
                                    preference.activityType,
                                    channel,
                                    value === true,
                                )
                            }
                        />
                    </div>
                </td>
            ))}
        </tr>
    );
}

function ActivityGroup({
    group,
    updatingActivityTypes,
    onChannelToggle,
}: {
    group: ActivityGroupData;
    updatingActivityTypes: string[];
    onChannelToggle: (
        activityType: ActivityType,
        channel: NotificationChannel,
        checked: boolean,
    ) => Promise<void>;
}) {
    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle>{group.label}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full table-fixed text-sm">
                        <thead>
                            <tr>
                                <th className="text-left pb-2 pr-3 font-medium">
                                    {NOTIFICATION_SETTINGS_COLUMN_ACTIVITY}
                                </th>
                                {notificationChannels.map((channel) => (
                                    <th
                                        key={channel}
                                        className="w-24 pb-2 text-center font-medium"
                                    >
                                        {prettifyToken(channel)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {group.preferences.map((preference) => (
                                <ActivityRow
                                    key={preference.activityType}
                                    preference={preference}
                                    isUpdating={updatingActivityTypes.includes(
                                        preference.activityType,
                                    )}
                                    onChannelToggle={onChannelToggle}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

function NotificationSettings({
    isLoading,
    groups,
    updatingActivityTypes,
    onChannelToggle,
}: {
    isLoading: boolean;
    groups: ActivityGroupData[];
    updatingActivityTypes: string[];
    onChannelToggle: (
        activityType: ActivityType,
        channel: NotificationChannel,
        checked: boolean,
    ) => Promise<void>;
}) {
    if (isLoading) {
        return (
            <Card className="mt-4">
                <CardContent className="py-6">{LOADING}</CardContent>
            </Card>
        );
    }

    if (!groups.length) {
        return (
            <Card className="mt-4">
                <CardContent className="py-6">
                    {NOTIFICATION_SETTINGS_EMPTY_STATE}
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            {groups.map((group) => (
                <ActivityGroup
                    key={group.label}
                    group={group}
                    updatingActivityTypes={updatingActivityTypes}
                    onChannelToggle={onChannelToggle}
                />
            ))}
        </>
    );
}

export default function Page() {
    const address = useContext(AddressContext);
    const { profile } = useContext(ProfileContext);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [preferences, setPreferences] = useState<
        NotificationPreferenceState[]
    >([]);
    const [updatingActivityTypes, setUpdatingActivityTypes] = useState<
        string[]
    >([]);
    const preferencesRef = useRef<NotificationPreferenceState[]>([]);

    useEffect(() => {
        preferencesRef.current = preferences;
    }, [preferences]);

    const defaultPreferences = useMemo(
        () => getDefaultPreferencesForPermissions(profile?.permissions || []),
        [profile?.permissions],
    );

    const getPersistedNotificationPreferences = useCallback(async () => {
        const query = `
            query {
                preferences: getNotificationPreferences {
                    activityType
                    channels
                }
            }
        `;

        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();

        const response = await fetch.exec();
        return (response.preferences || []) as NotificationPreferenceState[];
    }, [address.backend]);

    const updateNotificationPreference = useCallback(
        async ({
            activityType,
            channels,
        }: {
            activityType: ActivityType;
            channels: NotificationChannel[];
        }) => {
            const activityTypeEnumName =
                activityTypeEnumNameByValue.get(activityType);
            const channelEnumNames = channels
                .map((channel) =>
                    notificationChannelEnumNameByValue.get(channel),
                )
                .filter((channel): channel is string => Boolean(channel));

            if (
                !activityTypeEnumName ||
                channelEnumNames.length !== channels.length
            ) {
                throw new Error(TOAST_TITLE_ERROR);
            }

            const mutation = `
                mutation UpdateNotificationPreference(
                    $activityType: NotificationPreferenceActivityType!
                    $channels: [NotificationChannelType!]!
                ) {
                    preference: updateNotificationPreference(
                        activityType: $activityType
                        channels: $channels
                    ) {
                        activityType
                        channels
                    }
                }
            `;

            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload({
                    query: mutation,
                    variables: {
                        activityType: activityTypeEnumName,
                        channels: channelEnumNames,
                    },
                })
                .setIsGraphQLEndpoint(true)
                .build();

            const response = await fetch.exec();
            return response.preference as NotificationPreferenceState;
        },
        [address.backend],
    );

    useEffect(() => {
        if (!address.backend) {
            return;
        }

        let cancelled = false;

        (async () => {
            setIsLoading(true);
            try {
                const loadedPreferences =
                    await getPersistedNotificationPreferences();
                if (!cancelled) {
                    setPreferences(
                        mergePersistedPreferences({
                            defaults: defaultPreferences,
                            persisted: loadedPreferences,
                        }),
                    );
                }
            } catch (err: any) {
                if (!cancelled) {
                    setPreferences(defaultPreferences);
                    toast({
                        title: TOAST_TITLE_ERROR,
                        description: err.message,
                        variant: "destructive",
                    });
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [
        address.backend,
        defaultPreferences,
        getPersistedNotificationPreferences,
        toast,
    ]);

    const onChannelToggle = useCallback(
        async (
            activityType: ActivityType,
            channel: NotificationChannel,
            checked: boolean,
        ) => {
            if (updatingActivityTypes.includes(activityType)) {
                return;
            }

            const currentPreference = preferencesRef.current.find(
                (preference) => preference.activityType === activityType,
            );
            if (!currentPreference) {
                return;
            }

            const previousChannels = currentPreference.channels;
            const nextChannels = getUpdatedChannels({
                channels: previousChannels,
                channel,
                checked,
            });

            if (areChannelsEqual(previousChannels, nextChannels)) {
                return;
            }

            setPreferences((currentPreferences) =>
                currentPreferences.map((preference) =>
                    preference.activityType === activityType
                        ? {
                              ...preference,
                              channels: nextChannels,
                          }
                        : preference,
                ),
            );
            setUpdatingActivityTypes((current) => [...current, activityType]);

            try {
                const updatedPreference = await updateNotificationPreference({
                    activityType,
                    channels: nextChannels,
                });
                setPreferences((currentPreferences) =>
                    currentPreferences.map((preference) =>
                        preference.activityType === activityType
                            ? {
                                  ...preference,
                                  channels: normalizeChannels(
                                      updatedPreference.channels,
                                  ),
                              }
                            : preference,
                    ),
                );
            } catch (err: any) {
                setPreferences((currentPreferences) =>
                    currentPreferences.map((preference) =>
                        preference.activityType === activityType
                            ? {
                                  ...preference,
                                  channels: previousChannels,
                              }
                            : preference,
                    ),
                );
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: err.message,
                    variant: "destructive",
                });
            } finally {
                setUpdatingActivityTypes((current) =>
                    current.filter((item) => item !== activityType),
                );
            }
        },
        [toast, updateNotificationPreference, updatingActivityTypes],
    );

    const groupedPreferences = useMemo<ActivityGroupData[]>(
        () =>
            permissionGroupOrder
                .map((permission) => ({
                    label: permissionGroupLabels[permission],
                    preferences: preferences.filter(
                        (preference) =>
                            Constants.ActivityPermissionMap[
                                preference.activityType
                            ] === permission,
                    ),
                }))
                .filter((group) => group.preferences.length),
        [preferences],
    );

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <h1 className="text-4xl font-semibold mb-2">
                {NOTIFICATION_SETTINGS_PAGE_HEADER}
            </h1>
            <p className="text-sm text-muted-foreground">
                {NOTIFICATION_SETTINGS_PAGE_DESCRIPTION}
            </p>
            <NotificationSettings
                isLoading={isLoading}
                groups={groupedPreferences}
                updatingActivityTypes={updatingActivityTypes}
                onChannelToggle={onChannelToggle}
            />
            <Resources
                links={[
                    {
                        href: "https://docs.courselit.app/en/users/notifications/",
                        text: NOTIFICATION_SETTINGS_RESOURCE_TEXT,
                    },
                ]}
            />
        </DashboardContent>
    );
}
