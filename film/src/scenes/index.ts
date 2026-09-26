import React from 'react';
import {SceneProps} from '../components/SceneShell';
import {S1ColdOpen} from './S1ColdOpen';
import {S2Blur} from './S2Blur';
import {S3Catch} from './S3Catch';
import {S4Infer} from './S4Infer';
import {S5Ingredients} from './S5Ingredients';
import {S6Lab} from './S6Lab';
import {S7Draw} from './S7Draw';
import {S8End} from './S8End';

export type SceneEntry = {id: string; key: string; Component: React.FC<SceneProps>};

// Order matters: scenes play back to back in this order (see timeline.json).
export const SCENES: SceneEntry[] = [
	{id: 'cold', key: 'S1', Component: S1ColdOpen},
	{id: 'blur', key: 'S2', Component: S2Blur},
	{id: 'catch', key: 'S3', Component: S3Catch},
	{id: 'infer', key: 'S4', Component: S4Infer},
	{id: 'ingredients', key: 'S5', Component: S5Ingredients},
	{id: 'lab', key: 'S6', Component: S6Lab},
	{id: 'draw', key: 'S7', Component: S7Draw},
	{id: 'end', key: 'S8', Component: S8End},
];
