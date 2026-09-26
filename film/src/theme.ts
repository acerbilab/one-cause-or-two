import {loadFont as loadNunito} from '@remotion/google-fonts/Nunito';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';
import {loadFont as loadSerif} from '@remotion/google-fonts/STIXTwoText';

export const FONT = loadNunito('normal', {weights: ['600', '700', '800', '900'], subsets: ['latin']}).fontFamily;
export const MONO = loadMono('normal', {weights: ['400', '600'], subsets: ['latin']}).fontFamily;
export const MATH = loadSerif('italic', {weights: ['400', '600'], subsets: ['latin']}).fontFamily;

export const W = 1920;
export const H = 1080;
export const FPS = 30;

// Palette. Semantic colours are shared by every scene: sight, sound, belief, prior.
export const C = {
	night: '#0B1026',
	sky1: '#0D1433',
	sky2: '#1A2356',
	sky3: '#343679',
	warm: '#FF9A6B',
	moon: '#F3EBD6',
	mtnFar: '#2A3574',
	mtnMid: '#1F295E',
	mtnNear: '#172049',
	snow: '#5A6AB0',
	hill: '#131B40',
	grass: '#0E1532',
	grassHi: '#253770',
	bush: '#16284A',
	bushHi: '#23406B',
	rock: '#3B3F6B',
	rockHi: '#555A8C',
	rockDark: '#262A4C',
	sight: '#5CC8FF',
	sound: '#6EE7A0',
	belief: '#FFB547',
	prior: '#C39BFF',
	text: '#F4F1EA',
	dim: '#A9B1D6',
	fur: '#B9773F',
	furDark: '#86502A',
	furLight: '#EBC593',
	furShade: '#9C6233',
	nose: '#3A2317',
	eye: '#1A1426',
	earIn: '#D9917C',
	fox: '#E8703A',
	foxDark: '#B8502A',
	foxLight: '#F6EDE0',
	stamp: '#FF5A5F',
	rim: '#9FB3FF',
};
