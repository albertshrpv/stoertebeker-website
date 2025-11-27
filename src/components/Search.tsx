// src/components/Search.tsx
import React, { useState, useEffect } from 'react';
import { Markup } from "react-render-markup";
import type SearchIndexItem from '../lib/interfaces/searchIndexItem';


const componentContentPadding = "py-12 md:py-16 xl:py-20 px-6 md:px-16 xl:px-20";


const Search: React.FC = () => {
    const [query, setQuery] = useState<string>('');
    const [results, setResults] = useState<SearchIndexItem[]>([]);
    const [index, setIndex] = useState<SearchIndexItem[]>([]);
    const [initialised, setInitialised] = useState<boolean>(false);

    const resultDivStyle = {
        minHeight: 'calc(100vh - 112px - 488px)',
    };


    useEffect(() => {
        fetch('/search-index.json')
            .then(response => response.json())
            .then((data: SearchIndexItem[]) => setIndex(data));

        // Get the query parameter from the URL
        const params = new URLSearchParams(window.location.search);
        const queryParam = params.get('q');
        if (queryParam) {
            setQuery(queryParam);
        }
        setInitialised(true);
    }, []);

    useEffect(() => {
        if (query) {
            const filteredResults = index.filter(item =>
                item.title?.toLowerCase().includes(query.toLowerCase()) ||
                item.content.some(content =>
                    content?.toLowerCase().includes(query.toLowerCase())
                )
            );
            setResults(filteredResults);
        } else {
            setResults([]);
        }
    }, [query, index]);

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value);
        // Update the URL query parameter
        const params = new URLSearchParams(window.location.search);
        if (event.target.value) {
            params.set('q', event.target.value);
        } else {
            params.delete('q');
        }
        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    };

    return (
        <section className={`max-w-screen-2xl text-start mx-auto ${componentContentPadding}`}>
            <div className="markup text-center">
                <h1>
                    <span className="ck-highlight-gelb">Hier</span> finden Sie garantiert, wonach Sie suchen. Geben Sie einfach Ihren <span className="ck-highlight-gelb">Suchbegriff</span> ein.
                </h1>
            </div>
            <div className="max-w-md mx-auto my-6 lg:my-14">
                <label htmlFor="search" className="mb-2 text-sm font-medium text-gray-900 sr-only">Search</label>
                <div className="relative">
                    <div className="absolute inset-y-0 start-0 flex items-center ps-5 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-900 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                        </svg>
                    </div>
                    <input
                        value={query}
                        onChange={handleSearch}
                        id="search"
                        className="block w-full placeholder-gray-900 p-4 ps-14 font-medium text-lg text-gray-900 border-none rounded-lg bg-primary-500/20 focus:outline-none focus:ring-0"
                        placeholder={initialised ? 'Seiten durchsuchen...' : ''}
                    />
                </div>
            </div>
            <div>
                {query != "" && (
                    <div className="">
                        {results.length} {results.length === 1 ? "Suchergebnis" : "Suchergebnisse"} für <span className="italic font-semibold">{query}</span> :
                    </div>
                )}
            </div>
            <div style={resultDivStyle} className="flex flex-col justify-start mt-10">
                {results.length === 0 && (
                    <div className="text-center mt-6 lg:mt-16">
                        <h2 className="text-2xl">{query != "" ? "Keine Ergebnisse gefunden. :(" : "Bitte geben Sie einen Suchbegriff ein."}</h2>
                    </div>
                )}
                <div className="">
                    {results.map((result, index) => (
                        <ResultEntry key={index} result={result} query={query} />
                    ))}
                </div>
            </div>
        </section>
    );
};


const ResultEntry: React.FC<{ result: SearchIndexItem, query: string }> = ({ result, query }) => {
    let allContent = result.content.join(". ");
    if (allContent.length > 600) {
        allContent = allContent.slice(0, 600) + "...";
    } else if (allContent.length === 0) {
    }

    let relevantContent = allContent;

    let matchContent = result.content.find(content => content?.toLowerCase().includes(query.toLowerCase()));
    if (matchContent) {
        relevantContent = matchContent;
        relevantContent = shortenString(relevantContent, query);
    }


    const highlightedTitle = result.title?.replace(new RegExp(`(${query})`, 'gi'), '<span class="highlight-text">$1</span>');
    const highlightedContent = relevantContent?.replace(new RegExp(`(${query})`, 'gi'), '<span class="highlight-text">$1</span>');


    return (
        <a href={`/${result.slug}`} className="flex py-8 border-b-2 border-gray-100">
            <div className="flex flex-col justify-center w-full">
                <h2 className="mb-2 text-xl font-bold text-gray-900">
                    <div className="markup">
                        <Markup className="prose" markup={highlightedTitle} />
                    </div>
                </h2>
                <div className="flex gap-6 lg:gap-14 justify-between">
                    <div className="markup mb-2 text-gray-700">
                        <Markup className="prose" markup={highlightedContent} />
                    </div>
                    {result.thumbnail && (
                        <div className="shrink-0">
                            <img
                                className={`object-cover mr-5 w-24 h-24 max-w-full align-middle rounded-md`}
                                src={"https://backend.stoertebeker.de" + result.thumbnail + "?format=webp&w=800&embed"}
                            />
                        </div>)
                    }
                </div>
                <div className="group flex w-fit mt-4 items-center justify-center relative text-white font-light bg-primary-500 text-base md:text-lg pl-10 pr-10 py-2 rounded-lg hover:cursor-pointer overflow-hidden">
                    <span className="inline-block transform transition-transform duration-500 ease-in-out group-hover:translate-x-[-12px]">
                        Ansehen
                    </span>
                    <svg
                        className="fill-white absolute right-6 opacity-0 transform transition-all duration-500 ease-in-out group-hover:opacity-100"
                        xmlns="http://www.w3.org/2000/svg"
                        height="20px"
                        viewBox="0 -960 960 960"
                        width="20px"
                    ><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"></path></svg>
                </div>
            </div>
        </a>
    );
}

function shortenString(str: string, query: string, maxLength: number = 600): string {
    // Ensure the query is present in the string
    const queryIndex = str.indexOf(query);
    if (queryIndex === -1) {
        // If the query is not found, return the shortened string from the start with "..." if truncated
        return str.length > maxLength ? str.slice(0, maxLength) + "..." : str;
    }

    const queryLength = query.length;

    // Determine the initial start and end positions
    let start = Math.max(0, queryIndex - Math.floor((maxLength - queryLength) / 2));
    let end = start + maxLength;

    // Adjust the end if it exceeds the string length
    if (end > str.length) {
        end = str.length;
        start = Math.max(0, end - maxLength);
    }

    // Adjust the start to the beginning of the nearest sentence
    const sentenceEndings = [". ", "!", "?"];
    while (start > 0 && !sentenceEndings.includes(str[start - 1])) {
        start--;
    }

    // Check if the string is truncated
    const isTruncated = end < str.length;

    // Slice the string and add "..." if truncated
    const shortenedString = str.slice(start, end);
    return isTruncated ? shortenedString + "..." : shortenedString;
}

export default Search;
