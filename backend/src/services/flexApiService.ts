const flexApiBaseurl = process.env.FLEX_BASE_API_URL;

export async function fetchFlexPullsheetData(pullsheetId: string): Promise<any> {
  const response = await fetch(`${flexApiBaseurl}/line-item/${pullsheetId}/row-data/?_dc=1770171196563&codeList=quantity&codeList=upstreamLink&codeList=note&codeList=isVirtual&node=root`, {
    headers: {
      'X-Auth-Token': `${process.env.FLEX_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Error fetching data from Flex API: ${response.statusText}`);
  }

  return response.json();
}
