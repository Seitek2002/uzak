/*
 * Texts of the pet page: what research found and what to do, with sources.
 * Kept apart from factors.ts so the pet test does not ship them.
 */
import type { Source } from "../../factor/model/types.ts";
import type { PetFactorContent } from "./types.ts";

const pubmed = (title: string) => `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(`"${title}"`)}`;
const paper = (authors: string, title: string, where: string): Source => ({ authors, title, where, href: pubmed(title) });

export const PET_SOURCE = {} satisfies Record<string, Source>;

export const PET_CONTENT: Record<string, PetFactorContent> = {};

export const PET_SOURCES: Source[] = Object.values(PET_SOURCE as Record<string, Source>);

void paper;
