"use client";

import { useState, useEffect, useCallback, useContext } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import debounce from "lodash.debounce";
import { AddressContext } from "@components/contexts";

interface GifSelectorProps {
    onGifSelect: (gifUrl: string) => void;
}

export function GifSelector({ onGifSelect }: GifSelectorProps) {
    const [search, setSearch] = useState("");
    const [gifs, setGifs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const address = useContext(AddressContext);

    const fetchGifs = async (searchTerm: string) => {
        setLoading(true);
        try {
            const endpoint = searchTerm
                ? `${address.backend}/api/gifs/search?q=${encodeURIComponent(searchTerm)}`
                : `${address.backend}/api/gifs/trending`;

            const response = await fetch(endpoint);
            const data = await response.json();
            setGifs(data.data.map((gif: any) => gif.images.fixed_height.url));
        } catch (error) {
            console.error("Error fetching GIFs:", error);
        } finally {
            setLoading(false);
        }
    };

    const debouncedFetchGifs = useCallback(
        debounce((searchTerm: string) => fetchGifs(searchTerm), 300),
        [],
    );

    useEffect(() => {
        debouncedFetchGifs(search);
        return () => {
            debouncedFetchGifs.cancel();
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
