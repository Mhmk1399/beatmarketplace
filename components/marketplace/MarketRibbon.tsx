/** Static vector points keep the compact marketplace header light on every device. */
export function MarketRibbon() {
  return <svg className="market-ribbon" viewBox="0 0 850 240" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    {Array.from({ length: 33 }, (_, index) => {
      const shift = index * 2.8;
      return <path key={index} d={`M-40 ${140 + shift}C90 ${-44 + shift},178 ${249 - shift},292 ${132 - shift * .4}S433 ${2 + shift * .8},534 ${75 + shift}S719 ${214 - shift},900 ${32 + shift}`} />;
    })}
  </svg>;
}
