// Dynamic screen-reader copy lives beside the static text constants.
export const ACCESSIBILITY_LABELS = {
  SPOT_RATE: (title: string, ask: string, bid: string, unit: string, isRTL: boolean) =>
    isRTL ? `${title}، سعر البيع ${ask}، سعر الشراء ${bid}، ${unit}` : `${title}, ask ${ask}, bid ${bid}, ${unit}`,
  ALERT_METAL: (title: string, isRTL: boolean) => isRTL ? `المعدن: ${title}` : `Metal: ${title}`,
  ALERT_TARGET: (currency: string, isRTL: boolean) => isRTL
    ? `سعر البيع المستهدف بعملة ${currency} لكل غرام` : `Target ask price in ${currency} per gram`,
  REMOVE_ALERT: (title: string, price: string, isRTL: boolean) => isRTL
    ? `حذف تنبيه ${title} عند ${price}` : `Remove ${title} alert at ${price}`,
  PRICE_GRAPH: (from: string, to: string, isRTL: boolean) => isRTL
    ? `رسم بياني توضيحي من ${from} إلى ${to} لكل غرام` : `Illustrative chart from ${from} to ${to} per gram`,
} as const;
