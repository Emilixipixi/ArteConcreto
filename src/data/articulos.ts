import type { Articulo } from '../types';

// Materias primas e insumos (ilustrativos). Stock minimo en unidad base.
const mp = (sku: string, nombre: string, categoria: string, unidadBaseId: string, presUnidad: string, presFactor: number, stockMinimo: number, precio: number): Articulo => ({
  sku, nombre, tipo: 'materia_prima', categoria, unidadBaseId,
  presentaciones: [{ unidadId: presUnidad, factorABase: presFactor }],
  stockMinimo, activo: true, precioReferencia: precio,
});

// Receta estandar por unidad terminada, en unidad base: cemento kg, arena m3, grava m3, varilla m, aditivo L, pigmento kg, desmoldante L
const receta = (cem: number, are: number, gra: number, var_: number, adi: number, pig: number, des: number) => {
  const r = [
    { sku: 'MP-01', cantidadBase: cem }, { sku: 'MP-02', cantidadBase: are }, { sku: 'MP-03', cantidadBase: gra },
    { sku: 'MP-04', cantidadBase: var_ }, { sku: 'MP-05', cantidadBase: adi }, { sku: 'MP-06', cantidadBase: pig },
    { sku: 'MP-07', cantidadBase: des },
  ];
  return r.filter((x) => x.cantidadBase > 0);
};

const pt = (sku: string, nombre: string, categoria: string, stockMinimo: number, plazo: number, precio: number, rec: ReturnType<typeof receta>, unidadBaseId = 'und'): Articulo => ({
  sku, nombre, tipo: 'producto_terminado', categoria, unidadBaseId, presentaciones: [],
  stockMinimo, activo: true, receta: rec, plazoFabricacionDias: plazo, precioReferencia: precio,
});

export const ARTICULOS: Articulo[] = [
  mp('MP-01', 'Cemento gris', 'Aglomerantes', 'kg', 'saco50', 50, 800, 0.164),
  mp('MP-02', 'Arena fina', 'Agregados', 'm3', 'm3', 1, 4, 22),
  mp('MP-03', 'Grava', 'Agregados', 'm3', 'm3', 1, 4, 24),
  mp('MP-04', 'Varilla de acero 8 mm', 'Acero', 'm', 'var6', 6, 250, 1.83),
  mp('MP-05', 'Aditivo plastificante', 'Quimicos', 'L', 'cub19', 19, 60, 4.47),
  mp('MP-06', 'Pigmento', 'Quimicos', 'kg', 'saco25', 25, 25, 2.4),
  mp('MP-07', 'Desmoldante', 'Quimicos', 'L', 'tamb200', 200, 60, 3.1),
  // SUPUESTO: BC-01 usa la receta del maestro (200 kg de cemento por banca); los demas son proporcionales.
  pt('BC-01', 'Banca exterior', 'Bancas', 4, 12, 185, receta(200, 0.12, 0.10, 6, 0.5, 1, 0.3)),
  pt('BC-02', 'Banca exterior con espaldar', 'Bancas', 3, 15, 260, receta(260, 0.16, 0.13, 8, 0.6, 1.3, 0.4)),
  pt('MC-01', 'Mesa exterior', 'Mesas', 2, 10, 240, receta(180, 0.10, 0.09, 5, 0.45, 0.9, 0.25)),
  pt('MC-02', 'Mesa exterior redonda', 'Mesas', 2, 14, 290, receta(210, 0.12, 0.10, 6, 0.5, 1.0, 0.3)),
  pt('MT-01', 'Maceta mediana', 'Macetas', 10, 5, 55, receta(60, 0.04, 0.03, 1.5, 0.15, 0.3, 0.1)),
  pt('MT-02', 'Maceta grande', 'Macetas', 5, 7, 95, receta(110, 0.07, 0.06, 3, 0.28, 0.55, 0.18)),
  pt('BO-01', 'Bolardo cónico', 'Bolardos', 4, 8, 60, receta(45, 0.03, 0.02, 1, 0.1, 0.2, 0.08)),
  pt('BO-02', 'Bolardo cilíndrico', 'Bolardos', 6, 8, 55, receta(40, 0.025, 0.02, 1, 0.1, 0.2, 0.07)),
  pt('CA-01', 'Caneca de basura exterior', 'Canecas', 3, 7, 85, receta(70, 0.04, 0.03, 2, 0.15, 0.3, 0.12)),
  pt('BI-01', 'Bicicletero 5 plazas', 'Bicicleteros', 2, 10, 210, receta(150, 0.09, 0.07, 5, 0.4, 0.7, 0.22)),
  pt('LV-01', 'Lavamanos cuadrado', 'Lavamanos', 2, 6, 120, receta(55, 0.03, 0.03, 1.2, 0.12, 0.25, 0.1)),
  pt('CC-01', 'Calado decorativo', 'Cerramientos y calados', 4, 9, 70, receta(35, 0.02, 0.02, 0, 0.08, 0.15, 0.06)),
  // SUPUESTO: el piso modular se maneja en m2 (el maestro lo indica como "base m2"); los demas productos en und.
  pt('PI-01', 'Piso modular (m2)', 'Pisos', 20, 12, 32, receta(28, 0.02, 0.02, 2, 0.05, 0.1, 0.03), 'm2'),
];

export const articuloPorSku = (sku: string) => ARTICULOS.find((a) => a.sku === sku);
