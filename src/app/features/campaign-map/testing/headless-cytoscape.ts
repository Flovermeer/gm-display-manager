import cytoscape from 'cytoscape';

export function createHeadlessCytoscape(options: cytoscape.CytoscapeOptions): cytoscape.Core {
  return cytoscape({
    ...options,
    container: undefined,
    headless: true,
    styleEnabled: false,
  });
}
