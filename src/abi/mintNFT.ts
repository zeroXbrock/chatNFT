/*
struct MintNFTConfidentialParams {
  {type: 'bytes', name: 'privateKey'}
  {type: 'address', name: 'recipient'}
  {type: 'string[]', name: 'prompts'}
  {type: 'string', name: 'openaiApiKey'}
}
*/

export default [
  {
    name: 'MintNFTConfidentialParams',
    inputs: [
      {
        components: [
          {type: 'bytes', name: 'privateKey'},
          {type: 'address', name: 'recipient'},
          {type: 'string[]', name: 'prompts'},
          {type: 'string', name: 'openaiApiKey'},
        ],
        // name: 'foo',
        type: 'tuple',
      },
    ],
  }
] as const
