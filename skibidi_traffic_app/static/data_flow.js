export function exportToJSON(intersectii) {
  const exportData = {
    intersectii: intersectii.map((inter, idx) => ({
      id: idx,
      varfuri: inter.listaVarfuri.map(p => ({ x: p.x, y: p.y })),
      strazi: inter.listaStrazi.map(str => ({
        indexLatura: str.indexLatura,
        pozitiePeLatura: str.pozitiePeLatura,
        benziIn: str.benziIn,
        benziOut: str.benziOut,
        lungime: str.lungime,
        trecerePietoni: str.trecerePietoni,
        semafoare: {
          in: str.semafoare.in,
          out: str.semafoare.out
        }
      }))
    }))
  };

  console.log("Export JSON:", JSON.stringify(exportData, null, 2));
  return exportData;
}