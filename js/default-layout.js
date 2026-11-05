// Shared startup drawing. Exported from FEMS by Gics.
window.FEMSDefaultLayout = {
  "format": "gics-fems",
  "version": 3,
  "name": "FEMS demo",
  "site": {
    "width": 100,
    "depth": 100
  },
  "equipment": [
    {
      "id": "eq-f9140d03-45e0-4d88-b0e0-09ae5a7f4172",
      "type": "tower",
      "code": "",
      "name": "GRID 01",
      "x": -24.5,
      "z": -0.5,
      "rotation": 0,
      "width": 3.6,
      "depth": 3.6,
      "height": 12
    },
    {
      "id": "eq-745a5afa-3d39-4024-9e4f-338e21112cdd",
      "type": "receiving",
      "code": "",
      "name": "수전반",
      "x": -11.37,
      "z": -9.13,
      "rotation": 0,
      "width": 2.4,
      "depth": 1.2,
      "height": 2.4,
      "parentId": "eq-f9140d03-45e0-4d88-b0e0-09ae5a7f4172"
    },
    {
      "id": "eq-52a0f9aa-8876-4d9c-8701-f2db1a855bab",
      "type": "transformer",
      "code": "",
      "name": "변압기",
      "x": -7.67,
      "z": 11.38,
      "rotation": 0,
      "width": 2.4,
      "depth": 1.8,
      "height": 2.4,
      "parentId": "eq-f9140d03-45e0-4d88-b0e0-09ae5a7f4172"
    },
    {
      "id": "eq-76e7671c-d158-48f4-af98-e108d7a0419d",
      "type": "distribution",
      "code": "",
      "name": "저압 배전반",
      "x": 9.9,
      "z": -0.4,
      "rotation": 90,
      "width": 2.4,
      "depth": 0.9,
      "height": 2.2,
      "parentId": "eq-e60ce7b2-4c36-4cf1-9970-49a2f900bee7"
    },
    {
      "id": "eq-a7943e0b-c305-447d-a96f-734ca7ad240a",
      "type": "panel",
      "code": "",
      "name": "분전반",
      "x": 16,
      "z": 5,
      "rotation": 90,
      "width": 0.8,
      "depth": 0.35,
      "height": 1.4,
      "parentId": "eq-76e7671c-d158-48f4-af98-e108d7a0419d"
    },
    {
      "id": "eq-7671881e-959e-4772-b1ad-ecf3ad12badf",
      "type": "panel",
      "code": "",
      "name": "분전반(1)",
      "x": 15.91,
      "z": 0.61,
      "rotation": 90,
      "width": 0.8,
      "depth": 0.35,
      "height": 1.4,
      "parentId": "eq-76e7671c-d158-48f4-af98-e108d7a0419d"
    },
    {
      "id": "eq-01b9a196-b5f8-413a-8351-4c21dacbab92",
      "type": "panel",
      "code": "",
      "name": "분전반(2)",
      "x": 15.77,
      "z": -2.81,
      "rotation": 90,
      "width": 0.8,
      "depth": 0.35,
      "height": 1.4,
      "parentId": "eq-76e7671c-d158-48f4-af98-e108d7a0419d"
    },
    {
      "id": "eq-e60ce7b2-4c36-4cf1-9970-49a2f900bee7",
      "type": "transformer",
      "code": "",
      "name": "변압기(1)",
      "x": 3.39,
      "z": 11.08,
      "rotation": 0,
      "width": 2.4,
      "depth": 1.8,
      "height": 2.4,
      "parentId": "eq-745a5afa-3d39-4024-9e4f-338e21112cdd"
    },
    {
      "id": "eq-f79f3849-27ea-46fc-b62c-155aad8f4a94",
      "type": "asset-d948b5b9-ff9d-402c-b6f5-1fa436bae50a",
      "code": "",
      "name": "Utility_1F_Ect_Pump L02",
      "x": 19.5,
      "z": 6.5,
      "rotation": 0,
      "width": 1.00050025013,
      "depth": 2,
      "height": 1.00050025013,
      "parentId": "eq-a7943e0b-c305-447d-a96f-734ca7ad240a"
    },
    {
      "id": "eq-7cbd6031-a617-4702-86c6-20045c23eb99",
      "type": "asset-d948b5b9-ff9d-402c-b6f5-1fa436bae50a",
      "code": "",
      "name": "Utility_1F_Ect_Pump L02(1)",
      "x": 19.54,
      "z": 1.09,
      "rotation": 0,
      "width": 1.00050025013,
      "depth": 2,
      "height": 1.00050025013,
      "parentId": "eq-a7943e0b-c305-447d-a96f-734ca7ad240a"
    },
    {
      "id": "eq-7a688d26-21ec-4f4e-bfd8-87e0f1cac7ee",
      "type": "asset-fdf07816-8fa8-44b5-9142-014dccd2c2c0",
      "code": "",
      "name": "공기 압축기(150HP)",
      "x": 7,
      "z": 23,
      "rotation": 0,
      "width": 2.83813364055,
      "depth": 2,
      "height": 2.02995391705
    }
  ],
  "buildings": [
    {
      "id": "building-b39b4605-038f-4660-b8e2-7ecb34aa2291",
      "name": "building_A",
      "type": "asset-1f14c10e-3a0b-435a-9cbf-4e5199481c9a",
      "x": 27.34,
      "z": -29.059,
      "rotation": 0,
      "width": 37.37,
      "depth": 39.1279555485,
      "height": 31.4513903101
    }
  ],
  "floors": [
    {
      "id": "floor-e3364bb2-8dca-4eb3-ba47-9a31d3385942",
      "name": "옥상",
      "x": -3.1,
      "z": -0.8,
      "rotation": 0,
      "width": 29,
      "depth": 29,
      "height": 1,
      "elevation": 30.4513903101,
      "buildingId": "building-b39b4605-038f-4660-b8e2-7ecb34aa2291",
      "level": "R"
    },
    {
      "id": "floor-1b026111-bb7d-4981-b479-f3096a596d90",
      "name": "4F",
      "x": -3.1,
      "z": -0.8,
      "rotation": 0,
      "width": 29,
      "depth": 29,
      "height": 1,
      "elevation": 23.588542732575,
      "buildingId": "building-b39b4605-038f-4660-b8e2-7ecb34aa2291",
      "level": "4F"
    },
    {
      "id": "floor-c4a2154b-0af3-423e-9db6-1c38ce8c4964",
      "name": "3F",
      "x": -3.1,
      "z": -0.8,
      "rotation": 0,
      "width": 29,
      "depth": 29,
      "height": 1,
      "elevation": 15.72569515505,
      "buildingId": "building-b39b4605-038f-4660-b8e2-7ecb34aa2291",
      "level": "3F"
    },
    {
      "id": "floor-6c1dba08-c535-49de-9078-9bae4d007fb1",
      "name": "2F",
      "x": -3.1,
      "z": -0.8,
      "rotation": 0,
      "width": 29,
      "depth": 29,
      "height": 1,
      "elevation": 7.862847577525,
      "buildingId": "building-b39b4605-038f-4660-b8e2-7ecb34aa2291",
      "level": "2F"
    },
    {
      "id": "floor-ff5d7de4-f699-4713-8063-ee432856d2a2",
      "name": "1F",
      "x": -3.1,
      "z": -0.8,
      "rotation": 0,
      "width": 29,
      "depth": 29,
      "height": 1,
      "elevation": 0,
      "buildingId": "building-b39b4605-038f-4660-b8e2-7ecb34aa2291",
      "level": "1F"
    }
  ],
  "networks": [
    {
      "parentId": "eq-f9140d03-45e0-4d88-b0e0-09ae5a7f4172",
      "root": "n0",
      "nodes": [
        {
          "id": "n0",
          "equipmentId": "eq-f9140d03-45e0-4d88-b0e0-09ae5a7f4172",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n3",
          "equipmentId": "eq-52a0f9aa-8876-4d9c-8701-f2db1a855bab",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n7",
          "equipmentId": "eq-745a5afa-3d39-4024-9e4f-338e21112cdd",
          "offset": {
            "x": 0,
            "z": 0
          }
        }
      ],
      "edges": [
        {
          "id": "net:eq-f9140d03-45e0-4d88-b0e0-09ae5a7f4172:n1",
          "from": "n0",
          "to": "n3",
          "bends": [
            {
              "x": -7.670000000000002,
              "z": -0.5
            }
          ],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
            "#dc2626",
            "#16a34a"
          ]
        },
        {
          "id": "net:eq-f9140d03-45e0-4d88-b0e0-09ae5a7f4172:n4",
          "from": "n0",
          "to": "n7",
          "bends": [
            {
              "x": -19.2,
              "z": -0.5
            },
            {
              "x": -19.2,
              "z": -9.13
            },
            {
              "x": -11.37,
              "z": -9.13
            },
            {
              "x": -11.37,
              "z": -9.5
            }
          ],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
            "#dc2626",
            "#0ea5e9",
            "#2563eb",
            "#2563eb",
            "#2563eb"
          ]
        }
      ]
    },
    {
      "parentId": "eq-e60ce7b2-4c36-4cf1-9970-49a2f900bee7",
      "root": "n0",
      "nodes": [
        {
          "id": "n0",
          "equipmentId": "eq-e60ce7b2-4c36-4cf1-9970-49a2f900bee7",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n3",
          "equipmentId": "eq-76e7671c-d158-48f4-af98-e108d7a0419d",
          "offset": {
            "x": 0,
            "z": 0
          }
        }
      ],
      "edges": [
        {
          "id": "net:eq-e60ce7b2-4c36-4cf1-9970-49a2f900bee7:n1",
          "from": "n0",
          "to": "n3",
          "bends": [
            {
              "x": 9.9,
              "z": 11.08
            },
            {
              "x": 9.9,
              "z": -0.4
            }
          ],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
            "#eab308",
            "#eab308",
            "#2563eb"
          ]
        }
      ]
    },
    {
      "parentId": "eq-76e7671c-d158-48f4-af98-e108d7a0419d",
      "root": "n0",
      "nodes": [
        {
          "id": "n0",
          "equipmentId": "eq-76e7671c-d158-48f4-af98-e108d7a0419d",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n3",
          "equipmentId": "eq-a7943e0b-c305-447d-a96f-734ca7ad240a",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n4",
          "x": 13.44,
          "z": -0.4
        },
        {
          "id": "n7",
          "equipmentId": "eq-7671881e-959e-4772-b1ad-ecf3ad12badf",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n9",
          "equipmentId": "eq-01b9a196-b5f8-413a-8351-4c21dacbab92",
          "offset": {
            "x": 0,
            "z": 0
          }
        }
      ],
      "edges": [
        {
          "id": "net:eq-76e7671c-d158-48f4-af98-e108d7a0419d:n1",
          "from": "n0",
          "to": "n3",
          "bends": [
            {
              "x": 13.44,
              "z": -0.4
            },
            {
              "x": 13.44,
              "z": 5
            }
          ],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
            "#2563eb",
            "#2563eb",
            "#2563eb"
          ]
        },
        {
          "id": "net:eq-76e7671c-d158-48f4-af98-e108d7a0419d:n4",
          "from": "n0",
          "to": "n4",
          "bends": [],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
            "#2563eb"
          ]
        },
        {
          "id": "net:eq-76e7671c-d158-48f4-af98-e108d7a0419d:n5",
          "from": "n4",
          "to": "n7",
          "bends": [
            {
              "x": 13.44,
              "z": 0.61
            }
          ],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
            "#2563eb",
            "#2563eb"
          ]
        },
        {
          "id": "net:eq-76e7671c-d158-48f4-af98-e108d7a0419d:n8",
          "from": "n4",
          "to": "n9",
          "bends": [
            {
              "x": 13.44,
              "z": -2.81
            }
          ],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
            "#2563eb",
            "#2563eb"
          ]
        }
      ]
    },
    {
      "parentId": "eq-745a5afa-3d39-4024-9e4f-338e21112cdd",
      "root": "n0",
      "nodes": [
        {
          "id": "n0",
          "equipmentId": "eq-745a5afa-3d39-4024-9e4f-338e21112cdd",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n3",
          "equipmentId": "eq-e60ce7b2-4c36-4cf1-9970-49a2f900bee7",
          "offset": {
            "x": 0,
            "z": 0
          }
        }
      ],
      "edges": [
        {
          "id": "net:eq-745a5afa-3d39-4024-9e4f-338e21112cdd:n1",
          "from": "n0",
          "to": "n3",
          "bends": [
            {
              "x": -7.39,
              "z": -9.13
            },
            {
              "x": -7.39,
              "z": -3.56
            },
            {
              "x": 3.39,
              "z": -3.56
            },
            {
              "x": 3.39,
              "z": -3.56
            },
            {
              "x": 3.39,
              "z": -3.56
            }
          ],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
            "#2563eb",
            "#2563eb",
            "#2563eb",
            "#2563eb",
            "#2563eb",
            "#2563eb"
          ]
        }
      ]
    },
    {
      "parentId": "eq-a7943e0b-c305-447d-a96f-734ca7ad240a",
      "root": "n0",
      "nodes": [
        {
          "id": "n0",
          "equipmentId": "eq-a7943e0b-c305-447d-a96f-734ca7ad240a",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n3",
          "equipmentId": "eq-f79f3849-27ea-46fc-b62c-155aad8f4a94",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n6",
          "equipmentId": "eq-7cbd6031-a617-4702-86c6-20045c23eb99",
          "offset": {
            "x": 0,
            "z": 0
          }
        }
      ],
      "edges": [
        {
          "id": "net:eq-a7943e0b-c305-447d-a96f-734ca7ad240a:n1",
          "from": "n0",
          "to": "n3",
          "bends": [
            {
              "x": 17.39,
              "z": 5
            },
            {
              "x": 17.39,
              "z": 6.5
            }
          ],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
            "#2563eb",
            "#2563eb",
            "#2563eb"
          ]
        },
        {
          "id": "net:eq-a7943e0b-c305-447d-a96f-734ca7ad240a:n4",
          "from": "n0",
          "to": "n6",
          "bends": [
            {
              "x": 17.39,
              "z": 5
            },
            {
              "x": 17.39,
              "z": 1.09
            },
            {
              "x": 19.54,
              "z": 1.09
            }
          ],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
            "#2563eb",
            "#2563eb",
            "#2563eb",
            "#2563eb"
          ]
        }
      ]
    }
  ],
  "project": {
    "id": "b46250ba-c3f9-4084-b314-c8ed58c0d3ce",
    "kind": "new",
    "baseRevision": "8cc3b8f5862db3696b356317899af56049b33da48175a02b25443008261bf8bd",
    "assets": [
      {
        "type": "asset-d948b5b9-ff9d-402c-b6f5-1fa436bae50a",
        "name": "Utility_1F_Ect_Pump L02",
        "en": "",
        "custom": true,
        "code": "",
        "group": "추가 에셋",
        "color": "#71869a",
        "description": "프로젝트에 등록된 GLB 설비입니다.",
        "model": "assets/equipment/asset-d948b5b9-ff9d-402c-b6f5-1fa436bae50a/model.glb",
        "sha256": "ff54611ac901169d86992bc525493c76063d21e0beab546fda8b3bb1f7a0041c",
        "width": 1.00050025013,
        "depth": 2,
        "height": 1.00050025013
      },
      {
        "type": "asset-fdf07816-8fa8-44b5-9142-014dccd2c2c0",
        "name": "공기 압축기(150HP)",
        "en": "",
        "custom": true,
        "code": "",
        "group": "추가 에셋",
        "color": "#71869a",
        "description": "프로젝트에 등록된 GLB 설비입니다.",
        "model": "assets/equipment/asset-fdf07816-8fa8-44b5-9142-014dccd2c2c0/model.glb",
        "sha256": "1132a293c9bdebc014c4e720e327568a73890bb3cff452a47fa771335cae0889",
        "width": 2.83813364055,
        "depth": 2,
        "height": 2.02995391705
      },
      {
        "type": "asset-1f14c10e-3a0b-435a-9cbf-4e5199481c9a",
        "name": "building_A",
        "en": "",
        "custom": true,
        "code": "",
        "group": "추가 에셋",
        "color": "#71869a",
        "description": "프로젝트에 등록된 GLB 설비입니다.",
        "model": "assets/equipment/asset-1f14c10e-3a0b-435a-9cbf-4e5199481c9a/model.glb",
        "kind": "building",
        "sha256": "efbb1c34ceda1a513120938e286bf929b507c725581e7cf4fc8977682ad89620",
        "width": 6.254,
        "depth": 6.5482,
        "height": 5.2635
      },
      {
        "type": "asset-40c12d3b-4f30-4b83-b957-7aab74cdf617",
        "name": "floor_1F",
        "en": "",
        "custom": true,
        "code": "",
        "group": "추가 에셋",
        "color": "#71869a",
        "description": "프로젝트에 등록된 GLB 설비입니다.",
        "model": "assets/equipment/asset-40c12d3b-4f30-4b83-b957-7aab74cdf617/model.glb",
        "kind": "floor",
        "sha256": "7e5ac83d75bf1a731cbf963e9ca979c06ba23c5da66d558a79f5a3a82d094b3b",
        "width": 5.5857,
        "depth": 5.079,
        "height": 0.45
      },
      {
        "type": "asset-14d39aef-3748-44fc-8aa0-d3f505a3d916",
        "name": "floor_1F",
        "en": "",
        "custom": true,
        "code": "",
        "group": "추가 에셋",
        "color": "#71869a",
        "description": "프로젝트에 등록된 GLB 설비입니다.",
        "model": "assets/equipment/asset-14d39aef-3748-44fc-8aa0-d3f505a3d916/model.glb",
        "kind": "floor",
        "sha256": "7e5ac83d75bf1a731cbf963e9ca979c06ba23c5da66d558a79f5a3a82d094b3b",
        "width": 5.5857,
        "depth": 5.079,
        "height": 0.45
      },
      {
        "type": "asset-c4d4e0ae-35c4-422c-a7fb-5925e367738d",
        "name": "floor_1F",
        "en": "",
        "custom": true,
        "code": "",
        "group": "추가 에셋",
        "color": "#71869a",
        "description": "프로젝트에 등록된 GLB 설비입니다.",
        "model": "assets/equipment/asset-c4d4e0ae-35c4-422c-a7fb-5925e367738d/model.glb",
        "kind": "floor",
        "sha256": "7e5ac83d75bf1a731cbf963e9ca979c06ba23c5da66d558a79f5a3a82d094b3b",
        "width": 5.5857,
        "depth": 5.079,
        "height": 0.45
      },
      {
        "type": "asset-0d2448e7-8e72-44a5-b969-6edde5b26d6a",
        "name": "floor_1F",
        "en": "",
        "custom": true,
        "code": "",
        "group": "추가 에셋",
        "color": "#71869a",
        "description": "프로젝트에 등록된 GLB 설비입니다.",
        "model": "assets/equipment/asset-0d2448e7-8e72-44a5-b969-6edde5b26d6a/model.glb",
        "kind": "floor",
        "sha256": "7e5ac83d75bf1a731cbf963e9ca979c06ba23c5da66d558a79f5a3a82d094b3b",
        "width": 5.5857,
        "depth": 5.079,
        "height": 0.45
      }
    ]
  }
};
