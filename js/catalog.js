(function (root) {
  'use strict';
  const catalog = [
    { type: 'tower', name: '송전탑', en: 'Transmission tower', code: 'GRID', group: '수전·배전', color: '#71869a', width: 3.6, depth: 3.6, height: 12, description: '한전 등 외부 전력망과 연결되는 고압·중압 전력 공급을 표현합니다.' },
    { type: 'receiving', name: '수전반', en: 'Incoming switchgear', code: 'SW', group: '수전·배전', color: '#496a8d', width: 2.4, depth: 1.2, height: 2.4, description: '외부에서 들어오는 전력을 받아 차단·보호하는 설비입니다.' },
    { type: 'transformer', name: '변압기', en: 'Transformer', code: 'TR', group: '수전·배전', color: '#b68a4d', width: 2.4, depth: 1.8, height: 2.4, description: '공급 전압을 설비에 필요한 전압으로 변환합니다.' },
    { type: 'distribution', name: '저압 배전반', en: 'LV switchboard', code: 'LV', group: '수전·배전', color: '#4c8397', width: 2.4, depth: 0.9, height: 2.2, description: '변압기에서 받은 저압 전력을 여러 계통으로 배분합니다.' },
    { type: 'mcc', name: 'MCC', en: 'Motor control center', code: 'MCC', group: '부하·보호', color: '#627e9b', width: 2.4, depth: 0.8, height: 2.2, description: '모터 제어반으로, 모터의 전원 공급·운전·보호를 담당합니다.' },
    { type: 'panel', name: '분전반', en: 'Distribution board', code: 'DB', group: '부하·보호', color: '#6a918e', width: 0.8, depth: 0.35, height: 1.4, description: '조명·콘센트 등 개별 회로로 전력을 분배합니다.' },
    { type: 'ups', name: 'UPS', en: 'Uninterruptible power supply', code: 'UPS', group: '부하·보호', color: '#7b76a2', width: 1.2, depth: 1, height: 1.8, description: '무정전 전원장치로, 정전 시 중요 설비에 전력을 공급합니다.' },
    { type: 'solar', name: '태양광 패널', en: 'Solar panel array', code: 'PV', group: '발전·저장', color: '#387fa9', width: 5, depth: 3, height: 1.8, description: '태양광을 이용해 전력을 생산하는 발전 설비입니다.' },
    { type: 'ess', name: 'ESS', en: 'Energy storage system', code: 'ESS', group: '발전·저장', color: '#39957e', width: 4, depth: 2, height: 2.6, description: '에너지 저장장치로, 전력을 저장하고 필요할 때 공급합니다.' }
  ].map(Object.freeze);
  const api = Object.freeze({ catalog: Object.freeze(catalog), get: type => catalog.find(item => item.type === type) });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FEMSCatalog = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
