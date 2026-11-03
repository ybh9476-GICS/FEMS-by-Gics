// Shared startup drawing. Exported from FEMS by Gics.
window.FEMSDefaultLayout = {
  "format": "gics-fems",
  "version": 2,
  "name": "FEMS 설비 배치 예시",
  "site": {
    "width": 60,
    "depth": 40
  },
  "equipment": [
    {
      "id": "eq-f9140d03-45e0-4d88-b0e0-09ae5a7f4172",
      "type": "tower",
      "code": "",
      "name": "송전탑",
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
      "id": "eq-7005d82b-a46f-41df-9b13-ecb2eed2d360",
      "type": "tower",
      "code": "",
      "name": "송전탑(1)",
      "x": 3,
      "z": -10.5,
      "rotation": 0,
      "width": 3.6,
      "depth": 3.6,
      "height": 12
    },
    {
      "id": "eq-144b7596-d4cf-4f89-a317-3f706a15961a",
      "type": "receiving",
      "code": "",
      "name": "수전반(1)",
      "x": -0.86,
      "z": -0.5,
      "rotation": 0,
      "width": 2.4,
      "depth": 1.2,
      "height": 2.4,
      "parentId": "eq-7005d82b-a46f-41df-9b13-ecb2eed2d360"
    },
    {
      "id": "eq-e60ce7b2-4c36-4cf1-9970-49a2f900bee7",
      "type": "transformer",
      "code": "",
      "name": "변압기(1)",
      "x": 5.5,
      "z": 8.81,
      "rotation": 0,
      "width": 2.4,
      "depth": 1.8,
      "height": 2.4,
      "parentId": "eq-144b7596-d4cf-4f89-a317-3f706a15961a"
    },
    {
      "id": "eq-76e7671c-d158-48f4-af98-e108d7a0419d",
      "type": "distribution",
      "code": "",
      "name": "저압 배전반",
      "x": 12.12,
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
            "#2563eb",
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
            "#2563eb",
            "#0ea5e9",
            "#2563eb",
            "#2563eb",
            "#2563eb"
          ]
        }
      ]
    },
    {
      "parentId": "eq-7005d82b-a46f-41df-9b13-ecb2eed2d360",
      "root": "n0",
      "nodes": [
        {
          "id": "n0",
          "equipmentId": "eq-7005d82b-a46f-41df-9b13-ecb2eed2d360",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n3",
          "equipmentId": "eq-144b7596-d4cf-4f89-a317-3f706a15961a",
          "offset": {
            "x": 0,
            "z": 0
          }
        }
      ],
      "edges": [
        {
          "id": "net:eq-7005d82b-a46f-41df-9b13-ecb2eed2d360:n1",
          "from": "n0",
          "to": "n3",
          "bends": [
            {
              "x": 3,
              "z": -0.5
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
      "parentId": "eq-144b7596-d4cf-4f89-a317-3f706a15961a",
      "root": "n0",
      "nodes": [
        {
          "id": "n0",
          "equipmentId": "eq-144b7596-d4cf-4f89-a317-3f706a15961a",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n2",
          "equipmentId": "eq-e60ce7b2-4c36-4cf1-9970-49a2f900bee7",
          "offset": {
            "x": 0,
            "z": 0
          }
        }
      ],
      "edges": [
        {
          "id": "net:eq-144b7596-d4cf-4f89-a317-3f706a15961a:n1",
          "from": "n0",
          "to": "n2",
          "bends": [
            {
              "x": -0.86,
              "z": 8.27
            },
            {
              "x": 5.5,
              "z": 8.27
            }
          ],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
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
              "x": 10.5,
              "z": 8.81
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
    }
  ]
};
