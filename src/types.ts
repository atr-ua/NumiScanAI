/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Coin {
  id: string;
  image: string; // base64 or placeholder
  imageObverse?: string; // photo of the obverse
  imageReverse?: string; // photo of the reverse
  title: string;
  denomination: string;
  country: string;
  year: number | string;
  metal: string;
  weight?: string;
  diameter?: string;
  estimatedValue: string;
  rarity: string;
  grade: string; // e.g. UNC, AU, XF, VF, F, VG, G, etc.
  historicalContext?: string;
  notes?: string;
  category?: number; // index 0–9, see categoryUtils
  recognizedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PythonScript {
  name: string;
  filename: string;
  description: string;
  code: string;
}
