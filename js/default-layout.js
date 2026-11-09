// Shared startup drawing. Exported from FEMS by Gics.
window.FEMSDefaultLayout = {
  "format": "gics-fems",
  "version": 4,
  "name": "FEMS Project",
  "site": {
    "width": 60,
    "depth": 40
  },
  "equipment": [
    {
      "id": "eq-6ffce070-5510-417b-9319-35aa6eacd355",
      "type": "tower",
      "code": "",
      "name": "Grid",
      "x": -25,
      "z": -3.905,
      "rotation": 90,
      "width": 3.6,
      "depth": 3.6,
      "height": 12
    },
    {
      "id": "eq-248d401b-1f5a-43bb-9351-f6eae7116562",
      "type": "receiving",
      "code": "",
      "name": "Incoming switchgear",
      "x": -15.96,
      "z": -3.905,
      "rotation": 90,
      "width": 2.4,
      "depth": 1.2,
      "height": 2.4,
      "parentId": "eq-6ffce070-5510-417b-9319-35aa6eacd355"
    },
    {
      "id": "eq-f1e0a999-4d50-4333-9faf-e928b8ac39f5",
      "type": "transformer",
      "code": "",
      "name": "Transformer",
      "x": -8.715000000000002,
      "z": 1.8550000000000002,
      "rotation": 90,
      "width": 2.4,
      "depth": 1.8,
      "height": 2.4,
      "parentId": "eq-248d401b-1f5a-43bb-9351-f6eae7116562"
    },
    {
      "id": "eq-1c453f68-be8a-4ea3-b957-5b2dbf3f1319",
      "type": "transformer",
      "code": "",
      "name": "Transformer (1)",
      "x": -8.715000000000002,
      "z": -11.03,
      "rotation": 90,
      "width": 2.4,
      "depth": 1.8,
      "height": 2.4,
      "parentId": "eq-248d401b-1f5a-43bb-9351-f6eae7116562"
    },
    {
      "id": "eq-dbf88c28-87c6-4ba1-b522-be6dd0fa3147",
      "type": "ess",
      "code": "",
      "name": "ESS",
      "x": -16,
      "z": 8.22,
      "rotation": 0,
      "width": 7,
      "depth": 2,
      "height": 2.6,
      "parentId": "eq-6ffce070-5510-417b-9319-35aa6eacd355"
    },
    {
      "id": "eq-ff0e5e18-e514-47e5-b10d-ef7142424e70",
      "type": "distribution",
      "code": "",
      "name": "LV Switchboard (1)",
      "x": -1.1999999999999993,
      "z": 1.8550000000000002,
      "rotation": 90,
      "width": 2.4,
      "depth": 0.9,
      "height": 2.2,
      "parentId": "eq-f1e0a999-4d50-4333-9faf-e928b8ac39f5"
    },
    {
      "id": "eq-163825fe-776f-4869-af94-1c21fe534ac2",
      "type": "distribution",
      "code": "",
      "name": "LV Switchboard (2)",
      "x": -1.1999999999999993,
      "z": -11.03,
      "rotation": 90,
      "width": 2.4,
      "depth": 0.9,
      "height": 2.2,
      "parentId": "eq-1c453f68-be8a-4ea3-b957-5b2dbf3f1319"
    },
    {
      "id": "eq-bd65e705-fda3-4e85-abd1-f75076d2a198",
      "type": "distribution",
      "code": "",
      "name": "LV Switchboard",
      "x": -1.1999999999999993,
      "z": 8.22,
      "rotation": 90,
      "width": 2.4,
      "depth": 0.9,
      "height": 2.2,
      "parentId": "eq-dbf88c28-87c6-4ba1-b522-be6dd0fa3147"
    },
    {
      "id": "eq-d69ad57e-5a27-4d0a-8dc0-9426fd13a12d",
      "type": "solar-2x2",
      "code": "",
      "name": "PV 2×2",
      "x": -17.5,
      "z": 16.24,
      "rotation": 0,
      "width": 10,
      "depth": 6,
      "height": 1.8
    },
    {
      "id": "eq-0c6bdebc-e59f-429a-8225-e3119fd7641b",
      "type": "mcc",
      "code": "",
      "name": "MCC",
      "x": 5.5,
      "z": 1.8550000000000002,
      "rotation": 90,
      "width": 2.4,
      "depth": 0.8,
      "height": 2.2,
      "parentId": "eq-ff0e5e18-e514-47e5-b10d-ef7142424e70"
    },
    {
      "id": "eq-a97da43f-0ba4-4b2b-beed-2eef15d46f6e",
      "type": "asset-86e53a87-9cc7-40f8-9196-46b64a887ef1",
      "code": "",
      "name": "Pump",
      "x": 8.82,
      "z": 6.57,
      "rotation": 0,
      "width": 1.0004002001,
      "depth": 1.9998,
      "height": 1.0004002001,
      "parentId": "eq-0c6bdebc-e59f-429a-8225-e3119fd7641b"
    },
    {
      "id": "eq-d243560f-d9a3-435f-89f2-c6af44821747",
      "type": "asset-86e53a87-9cc7-40f8-9196-46b64a887ef1",
      "code": "",
      "name": "Pump(1)",
      "x": 12.2,
      "z": 6.57,
      "rotation": 0,
      "width": 1.0004002001,
      "depth": 1.9998,
      "height": 1.0004002001,
      "parentId": "eq-0c6bdebc-e59f-429a-8225-e3119fd7641b"
    },
    {
      "id": "eq-98e5808c-e759-44d6-8a97-c69c65d1ab1f",
      "type": "asset-1e02c451-bdf1-4499-b65f-57656dfddbcc",
      "code": "",
      "name": "Air_Pressure150HP",
      "x": 9.67,
      "z": -7.84,
      "rotation": 0,
      "width": 3.33083364055,
      "depth": 2.3472,
      "height": 2.38235391705,
      "parentId": "eq-163825fe-776f-4869-af94-1c21fe534ac2"
    },
    {
      "id": "eq-02f7b6e8-9474-4d55-b1c4-f21c2d966469",
      "type": "asset-1e02c451-bdf1-4499-b65f-57656dfddbcc",
      "code": "",
      "name": "Air_Pressure150HP(1)",
      "x": 9.67,
      "z": -13.38,
      "rotation": 0,
      "width": 3.33083364055,
      "depth": 2.3472,
      "height": 2.38235391705,
      "parentId": "eq-163825fe-776f-4869-af94-1c21fe534ac2"
    }
  ],
  "buildings": [],
  "floors": [],
  "powerLinks": [
    {
      "from": "eq-6ffce070-5510-417b-9319-35aa6eacd355",
      "to": "eq-248d401b-1f5a-43bb-9351-f6eae7116562"
    },
    {
      "from": "eq-248d401b-1f5a-43bb-9351-f6eae7116562",
      "to": "eq-f1e0a999-4d50-4333-9faf-e928b8ac39f5"
    },
    {
      "from": "eq-248d401b-1f5a-43bb-9351-f6eae7116562",
      "to": "eq-1c453f68-be8a-4ea3-b957-5b2dbf3f1319"
    },
    {
      "from": "eq-6ffce070-5510-417b-9319-35aa6eacd355",
      "to": "eq-dbf88c28-87c6-4ba1-b522-be6dd0fa3147"
    },
    {
      "from": "eq-f1e0a999-4d50-4333-9faf-e928b8ac39f5",
      "to": "eq-ff0e5e18-e514-47e5-b10d-ef7142424e70"
    },
    {
      "from": "eq-1c453f68-be8a-4ea3-b957-5b2dbf3f1319",
      "to": "eq-163825fe-776f-4869-af94-1c21fe534ac2"
    },
    {
      "from": "eq-dbf88c28-87c6-4ba1-b522-be6dd0fa3147",
      "to": "eq-bd65e705-fda3-4e85-abd1-f75076d2a198"
    },
    {
      "from": "eq-d69ad57e-5a27-4d0a-8dc0-9426fd13a12d",
      "to": "eq-dbf88c28-87c6-4ba1-b522-be6dd0fa3147"
    },
    {
      "from": "eq-ff0e5e18-e514-47e5-b10d-ef7142424e70",
      "to": "eq-0c6bdebc-e59f-429a-8225-e3119fd7641b"
    },
    {
      "from": "eq-0c6bdebc-e59f-429a-8225-e3119fd7641b",
      "to": "eq-a97da43f-0ba4-4b2b-beed-2eef15d46f6e"
    },
    {
      "from": "eq-0c6bdebc-e59f-429a-8225-e3119fd7641b",
      "to": "eq-d243560f-d9a3-435f-89f2-c6af44821747"
    },
    {
      "from": "eq-163825fe-776f-4869-af94-1c21fe534ac2",
      "to": "eq-98e5808c-e759-44d6-8a97-c69c65d1ab1f"
    },
    {
      "from": "eq-163825fe-776f-4869-af94-1c21fe534ac2",
      "to": "eq-02f7b6e8-9474-4d55-b1c4-f21c2d966469"
    }
  ],
  "networks": [
    {
      "parentId": "eq-6ffce070-5510-417b-9319-35aa6eacd355",
      "root": "n0",
      "nodes": [
        {
          "id": "n0",
          "equipmentId": "eq-6ffce070-5510-417b-9319-35aa6eacd355",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n2",
          "equipmentId": "eq-248d401b-1f5a-43bb-9351-f6eae7116562",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n5",
          "equipmentId": "eq-dbf88c28-87c6-4ba1-b522-be6dd0fa3147",
          "offset": {
            "x": 0,
            "z": 0
          }
        }
      ],
      "edges": [
        {
          "id": "net:eq-6ffce070-5510-417b-9319-35aa6eacd355:n1",
          "from": "n0",
          "to": "n2",
          "bends": [],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
            "#2563eb"
          ]
        },
        {
          "id": "net:eq-6ffce070-5510-417b-9319-35aa6eacd355:n3",
          "from": "n0",
          "to": "n5",
          "bends": [
            {
              "x": -25,
              "z": 8.22
            },
            {
              "x": -16,
              "z": 8.22
            }
          ],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
            "#84cc16",
            "#84cc16",
            "#84cc16"
          ]
        }
      ]
    },
    {
      "parentId": "eq-248d401b-1f5a-43bb-9351-f6eae7116562",
      "root": "n0",
      "nodes": [
        {
          "id": "n0",
          "equipmentId": "eq-248d401b-1f5a-43bb-9351-f6eae7116562",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n2",
          "x": -8.715000000000002,
          "z": -0.375
        },
        {
          "id": "n4",
          "equipmentId": "eq-f1e0a999-4d50-4333-9faf-e928b8ac39f5",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n7",
          "equipmentId": "eq-1c453f68-be8a-4ea3-b957-5b2dbf3f1319",
          "offset": {
            "x": 0,
            "z": 0
          }
        }
      ],
      "edges": [
        {
          "id": "net:eq-248d401b-1f5a-43bb-9351-f6eae7116562:n1",
          "from": "n0",
          "to": "n2",
          "bends": [
            {
              "x": -8.715000000000002,
              "z": -3.905
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
          "id": "net:eq-248d401b-1f5a-43bb-9351-f6eae7116562:n3",
          "from": "n2",
          "to": "n4",
          "bends": [],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
            "#2563eb"
          ]
        },
        {
          "id": "net:eq-248d401b-1f5a-43bb-9351-f6eae7116562:n5",
          "from": "n2",
          "to": "n7",
          "bends": [
            {
              "x": -8.715000000000002,
              "z": -3.905
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
      "parentId": "eq-f1e0a999-4d50-4333-9faf-e928b8ac39f5",
      "root": "n0",
      "nodes": [
        {
          "id": "n0",
          "equipmentId": "eq-f1e0a999-4d50-4333-9faf-e928b8ac39f5",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n2",
          "equipmentId": "eq-ff0e5e18-e514-47e5-b10d-ef7142424e70",
          "offset": {
            "x": 0,
            "z": 0
          }
        }
      ],
      "edges": [
        {
          "id": "net:eq-f1e0a999-4d50-4333-9faf-e928b8ac39f5:n1",
          "from": "n0",
          "to": "n2",
          "bends": [],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
            "#2563eb"
          ]
        }
      ]
    },
    {
      "parentId": "eq-1c453f68-be8a-4ea3-b957-5b2dbf3f1319",
      "root": "n0",
      "nodes": [
        {
          "id": "n0",
          "equipmentId": "eq-1c453f68-be8a-4ea3-b957-5b2dbf3f1319",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n2",
          "equipmentId": "eq-163825fe-776f-4869-af94-1c21fe534ac2",
          "offset": {
            "x": 0,
            "z": 0
          }
        }
      ],
      "edges": [
        {
          "id": "net:eq-1c453f68-be8a-4ea3-b957-5b2dbf3f1319:n1",
          "from": "n0",
          "to": "n2",
          "bends": [],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
            "#2563eb"
          ]
        }
      ]
    },
    {
      "parentId": "eq-dbf88c28-87c6-4ba1-b522-be6dd0fa3147",
      "root": "n0",
      "nodes": [
        {
          "id": "n0",
          "equipmentId": "eq-dbf88c28-87c6-4ba1-b522-be6dd0fa3147",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n2",
          "equipmentId": "eq-bd65e705-fda3-4e85-abd1-f75076d2a198",
          "offset": {
            "x": 0,
            "z": 0
          }
        }
      ],
      "edges": [
        {
          "id": "net:eq-dbf88c28-87c6-4ba1-b522-be6dd0fa3147:n1",
          "from": "n0",
          "to": "n2",
          "bends": [],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
            "#2563eb"
          ]
        }
      ]
    },
    {
      "parentId": "eq-d69ad57e-5a27-4d0a-8dc0-9426fd13a12d",
      "root": "n0",
      "nodes": [
        {
          "id": "n0",
          "equipmentId": "eq-d69ad57e-5a27-4d0a-8dc0-9426fd13a12d",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n3",
          "equipmentId": "eq-dbf88c28-87c6-4ba1-b522-be6dd0fa3147",
          "offset": {
            "x": 0,
            "z": 0
          }
        }
      ],
      "edges": [
        {
          "id": "net:eq-d69ad57e-5a27-4d0a-8dc0-9426fd13a12d:n1",
          "from": "n0",
          "to": "n3",
          "bends": [
            {
              "x": -17.5,
              "z": 8.22
            }
          ],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
            "#84cc16",
            "#2563eb"
          ]
        }
      ]
    },
    {
      "parentId": "eq-ff0e5e18-e514-47e5-b10d-ef7142424e70",
      "root": "n0",
      "nodes": [
        {
          "id": "n0",
          "equipmentId": "eq-ff0e5e18-e514-47e5-b10d-ef7142424e70",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n2",
          "equipmentId": "eq-0c6bdebc-e59f-429a-8225-e3119fd7641b",
          "offset": {
            "x": 0,
            "z": 0
          }
        }
      ],
      "edges": [
        {
          "id": "net:eq-ff0e5e18-e514-47e5-b10d-ef7142424e70:n1",
          "from": "n0",
          "to": "n2",
          "bends": [],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
            "#2563eb"
          ]
        }
      ]
    },
    {
      "parentId": "eq-0c6bdebc-e59f-429a-8225-e3119fd7641b",
      "root": "n0",
      "nodes": [
        {
          "id": "n0",
          "equipmentId": "eq-0c6bdebc-e59f-429a-8225-e3119fd7641b",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n3",
          "equipmentId": "eq-a97da43f-0ba4-4b2b-beed-2eef15d46f6e",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n6",
          "equipmentId": "eq-d243560f-d9a3-435f-89f2-c6af44821747",
          "offset": {
            "x": 0,
            "z": 0
          }
        }
      ],
      "edges": [
        {
          "id": "net:eq-0c6bdebc-e59f-429a-8225-e3119fd7641b:n1",
          "from": "n0",
          "to": "n3",
          "bends": [
            {
              "x": 8.82,
              "z": 1.8550000000000002
            },
            {
              "x": 8.82,
              "z": 6.57
            }
          ],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
            "#eab308",
            "#eab308",
            "#2563eb"
          ]
        },
        {
          "id": "net:eq-0c6bdebc-e59f-429a-8225-e3119fd7641b:n4",
          "from": "n0",
          "to": "n6",
          "bends": [
            {
              "x": 12.2,
              "z": 1.8550000000000002
            }
          ],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
            "#eab308",
            "#eab308"
          ]
        }
      ]
    },
    {
      "parentId": "eq-163825fe-776f-4869-af94-1c21fe534ac2",
      "root": "n0",
      "nodes": [
        {
          "id": "n0",
          "equipmentId": "eq-163825fe-776f-4869-af94-1c21fe534ac2",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n1",
          "x": 9.67,
          "z": -11.03
        },
        {
          "id": "n3",
          "equipmentId": "eq-98e5808c-e759-44d6-8a97-c69c65d1ab1f",
          "offset": {
            "x": 0,
            "z": 0
          }
        },
        {
          "id": "n5",
          "equipmentId": "eq-02f7b6e8-9474-4d55-b1c4-f21c2d966469",
          "offset": {
            "x": 0,
            "z": 0
          }
        }
      ],
      "edges": [
        {
          "id": "net:eq-163825fe-776f-4869-af94-1c21fe534ac2:n1",
          "from": "n0",
          "to": "n1",
          "bends": [],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
            "#eab308"
          ]
        },
        {
          "id": "net:eq-163825fe-776f-4869-af94-1c21fe534ac2:n2",
          "from": "n1",
          "to": "n3",
          "bends": [],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
            "#eab308"
          ]
        },
        {
          "id": "net:eq-163825fe-776f-4869-af94-1c21fe534ac2:n4",
          "from": "n1",
          "to": "n5",
          "bends": [],
          "color": "#2563eb",
          "diameter": 0.2,
          "segmentColors": [
            "#eab308"
          ]
        }
      ]
    }
  ],
  "project": {
    "id": "4f5aecd8-84dd-4044-8f59-720f7dc2105d",
    "kind": "new",
    "baseRevision": "588e6248c8c824a1cf4b287298ab539214fdba516b845b41c18add264c4845fa",
    "assets": [
      {
        "type": "asset-86e53a87-9cc7-40f8-9196-46b64a887ef1",
        "name": "Pump",
        "en": "",
        "custom": true,
        "code": "",
        "group": "추가 에셋",
        "color": "#71869a",
        "description": "프로젝트에 등록된 GLB 설비입니다.",
        "model": "assets/equipment/asset-86e53a87-9cc7-40f8-9196-46b64a887ef1/model.glb",
        "kind": "equipment",
        "sha256": "ff54611ac901169d86992bc525493c76063d21e0beab546fda8b3bb1f7a0041c",
        "width": 0.2,
        "depth": 0.3998,
        "height": 0.2
      },
      {
        "type": "asset-1e02c451-bdf1-4499-b65f-57656dfddbcc",
        "name": "Air_Pressure150HP",
        "en": "",
        "custom": true,
        "code": "",
        "group": "추가 에셋",
        "color": "#71869a",
        "description": "프로젝트에 등록된 GLB 설비입니다.",
        "model": "assets/equipment/asset-1e02c451-bdf1-4499-b65f-57656dfddbcc/model.glb",
        "kind": "equipment",
        "sha256": "1132a293c9bdebc014c4e720e327568a73890bb3cff452a47fa771335cae0889",
        "width": 0.4927,
        "depth": 0.3472,
        "height": 0.3524
      }
    ]
  }
};
