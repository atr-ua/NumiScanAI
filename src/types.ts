/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * @author Andrii (ATR) Tarasenko
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
  thickness?: string;
  edge?: string;
  mintage?: string;
  estimatedValue: string;
  rarity: string;
  grade: string; // e.g. UNC, AU, XF, VF, F, VG, G, etc.
  historicalContext?: string;
  notes?: string;
  category?: number; // index 0–9, see categoryUtils
  vis_id?: number;   // display order (1..N); 0 = unsorted
  hasObverse?: number; // 0 or 1, computed server-side
  hasReverse?: number; // 0 or 1, computed server-side
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
