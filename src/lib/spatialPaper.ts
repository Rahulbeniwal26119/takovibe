export interface SpatialPaperAnchor {
    sourcePdfElementId: string;
    resourceId?: string;
    sourceNodeId: string;
    provider: 'llamaparse' | 'pdfjs';
    type: string;
    page: number;
    bbox: { x: number; y: number; w: number; h: number };
    pageWidth: number;
    pageHeight: number;
}

function anchorFor(element: any, elementsById: Map<string, any>): SpatialPaperAnchor | null {
    if (!element) return null;
    if (element.customData?.paperAnchor) return element.customData.paperAnchor as SpatialPaperAnchor;
    if (element.type === 'text' && element.containerId) {
        return elementsById.get(element.containerId)?.customData?.paperAnchor || null;
    }
    return null;
}

export function resolveSpatialPaperAnchor(
    hitElement: any,
    sceneElements: readonly any[],
): SpatialPaperAnchor | null {
    if (!hitElement) return null;
    const elementsById = new Map(sceneElements.map((element) => [element.id, element]));
    const directAnchor = anchorFor(hitElement, elementsById);
    if (directAnchor) return directAnchor;
    if (hitElement.type !== 'arrow') return null;

    const endElement = hitElement.endBinding?.elementId
        ? elementsById.get(hitElement.endBinding.elementId)
        : null;
    const startElement = hitElement.startBinding?.elementId
        ? elementsById.get(hitElement.startBinding.elementId)
        : null;
    return anchorFor(endElement, elementsById) || anchorFor(startElement, elementsById);
}
