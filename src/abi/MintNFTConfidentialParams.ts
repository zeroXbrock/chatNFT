/*
struct MintNFTConfidentialParams {
  {type: 'bytes', name: 'privateKey'}
  {type: 'address', name: 'recipient'}
  {type: 'string[]', name: 'prompts'}
  {type: 'string', name: 'openaiApiKey'}
}
*/

export default [{
  components: [
    {name: 'privateKey', type: 'string'},
    {name: 'recipient', type: 'address'},
    {name: 'prompts', type: 'string[]'},
    {name: 'openaiApiKey', type: 'string'},
  ],
  name: 'MintNFTConfidentialParams',
  type: 'tuple',
}] as const
