const metals = Object.freeze({
  GOLD: Object.freeze({
    code: 'GOLD',
    name: 'Gold',
    purities: Object.freeze([
      Object.freeze({ label: '24K', fineness: 999 }),
      Object.freeze({ label: '22K', fineness: 916 }),
      Object.freeze({ label: '21K', fineness: 875 }),
      Object.freeze({ label: '18K', fineness: 750 }),
    ]),
  }),
  SILVER: Object.freeze({
    code: 'SILVER',
    name: 'Silver',
    purities: Object.freeze([
      Object.freeze({ label: '999', fineness: 999 }),
    ]),
  }),
});

export default metals;
