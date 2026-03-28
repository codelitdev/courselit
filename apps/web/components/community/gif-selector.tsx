"use client";

import {
    useState,
    useEffect,
    useCallback,
    useContext,
    memo,
    useMemo,
    useRef,
} from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import debounce from "lodash.debounce";
import { AddressContext } from "@components/contexts";

interface GifSelectorProps {
    onGifSelect: (gifUrl: string) => void;
}

function GifSelectorComponent({ onGifSelect }: GifSelectorProps) {
    const [search, setSearch] = useState("");
    const [gifs, setGifs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const address = useContext(AddressContext);
    const requestSeqRef = useRef(0);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchGifs = useCallback(
        async (searchTerm: string) => {
            const requestId = ++requestSeqRef.current;
            abortControllerRef.current?.abort();
            const controller = new AbortController();
            abortControllerRef.current = controller;
            setLoading(true);

            try {
                const endpoint = searchTerm
                    ? `${address.backend}/api/gifs/search?q=${encodeURIComponent(searchTerm)}`
                    : `${address.backend}/api/gifs/trending`;

                const response = await fetch(endpoint, {
                    signal: controller.signal,
                });
                const data = await response.json();
                if (requestId === requestSeqRef.current) {
                    setGifs(
                        data.data.map(
                            (gif: any) => gif.images.fixed_height.url,
                        ),
                    );
                }
            } catch (error) {
                if ((error as Error).name !== "AbortError") {
                    console.error("Error fetching GIFs:", error);
                }
            } finally {
                if (requestId === requestSeqRef.current) {
                    setLoading(false);
                }
            }
        },
        [address.backend],
    );

    const debouncedFetchGifs = useMemo(
        () =>
            debounce((searchTerm: string) => {
                void fetchGifs(searchTerm);
            }, 300),
        [fetchGifs],
    );

    useEffect(() => {
        debouncedFetchGifs(search);
        return () => {
            debouncedFetchGifs.cancel();
            abortControllerRef.current?.abort();
        };
    }, [search, debouncedFetchGifs]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
    };

    return (
        <div className="w-full space-y-4">
            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search GIFs"
                    className="pl-8"
                    value={search}
                    onChange={handleSearchChange}
                />
            </div>

            <ScrollArea className="h-[300px]">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <p>Loading GIFs...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {gifs.map((gif, index) => (
                            <img
                                key={index}
                                src={gif}
                                alt={`GIF ${index + 1}`}
                                className="w-full h-auto cursor-pointer"
                                onClick={() => onGifSelect(gif)}
                            />
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}

export const GifSelector = memo(GifSelectorComponent);
