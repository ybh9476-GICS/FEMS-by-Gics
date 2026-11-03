// Shared startup drawing. Exported from FEMS by Gics.
window.FEMSDefaultLayout = {
  "format": "gics-fems",
  "version": 1,
  "name": "FEMS 설비 배치 예시",
  "site": {
    "width": 60,
    "depth": 40
  },
  "equipment": [
    {
      "id": "eq-106738cd-8502-4bb9-9889-d481a66c9d4a",
      "type": "mcc",
      "code": "MCC-01",
      "name": "MCC",
      "x": -7,
      "z": 5,
      "rotation": 0,
      "width": 2.4,
      "depth": 0.8,
      "height": 2.2
    },
    {
      "id": "eq-dedc8f5e-fc28-4538-bea9-7a12beba13e6",
      "type": "tower",
      "code": "GRID-01",
      "name": "송전탑",
      "x": -15,
      "z": -6.59,
      "rotation": 0,
      "width": 3.6,
      "depth": 3.6,
      "height": 12,
      "junction": {
        "x": 0,
        "z": 0
      }
    },
    {
      "id": "eq-f8c8b2b0-fdd2-43a2-83d7-8e82b991752a",
      "type": "distribution",
      "code": "LV-02",
      "name": "저압 배전반",
      "x": -4.26,
      "z": 16.27,
      "rotation": 0,
      "width": 2.4,
      "depth": 0.9,
      "height": 2.2,
      "parentId": "eq-dedc8f5e-fc28-4538-bea9-7a12beba13e6",
      "connection": {
        "diameter": 0.2,
        "color": "#2563eb",
        "bends": [
          {
            "x": -7.02,
            "z": -6.59
          },
          {
            "x": -7.02,
            "z": -1.48
          },
          {
            "x": -3.09,
            "z": -1.48
          },
          {
            "x": -3.09,
            "z": 2.78
          },
          {
            "x": -9.72,
            "z": 2.78
          },
          {
            "x": -9.72,
            "z": 6.85
          },
          {
            "x": -4.26,
            "z": 6.85
          }
        ],
        "end": {
          "x": 0,
          "z": 0
        }
      }
    },
    {
      "id": "eq-4d1d64d0-b5bc-4767-8ade-4462849a9fbe",
      "type": "receiving",
      "code": "SW-01",
      "name": "수전반",
      "x": -7,
      "z": -10.84,
      "rotation": 0,
      "width": 2.38,
      "depth": 1.09,
      "height": 2.4,
      "parentId": "eq-dedc8f5e-fc28-4538-bea9-7a12beba13e6",
      "connection": {
        "diameter": 0.2,
        "color": "#2563eb",
        "bends": [
          {
            "x": -9.44,
            "z": -6.59
          },
          {
            "x": -9.44,
            "z": -5.89
          },
          {
            "x": -7,
            "z": -5.89
          }
        ],
        "end": {
          "x": 0,
          "z": 0
        }
      }
    },
    {
      "id": "eq-75cd381f-7204-4844-9d1d-0131ab69a3c6",
      "type": "panel",
      "code": "DB-01",
      "name": "분전반",
      "x": 0,
      "z": 5,
      "rotation": 0,
      "width": 0.8,
      "depth": 0.35,
      "height": 1.4
    },
    {
      "id": "eq-5796b10f-a882-45ff-bcb2-f3b3fa426197",
      "type": "solar",
      "code": "PV-01",
      "name": "태양광 패널",
      "x": -15,
      "z": 6,
      "rotation": 0,
      "width": 5,
      "depth": 3,
      "height": 1.8
    },
    {
      "id": "eq-e5daa52d-4fd8-4c76-814c-4c138427f6d2",
      "type": "ess",
      "code": "ESS-01",
      "name": "ESS",
      "x": 14.87,
      "z": 3.81,
      "rotation": 0,
      "width": 3.67,
      "depth": 2,
      "height": 2.6
    },
    {
      "id": "eq-4a00f6e0-a76b-4fdf-ab30-bad494beb044",
      "type": "transformer",
      "code": "TR-01",
      "name": "변압기",
      "x": 25.94,
      "z": 8.61,
      "rotation": 0,
      "width": 2.4,
      "depth": 1.8,
      "height": 2.4,
      "parentId": "eq-4d1d64d0-b5bc-4767-8ade-4462849a9fbe",
      "connection": {
        "diameter": 0.2,
        "color": "#2563eb"
      }
    },
    {
      "id": "eq-504689bf-96aa-4ddf-81f8-ff32dd237155",
      "type": "ups",
      "code": "UPS-01",
      "name": "UPS",
      "x": 7,
      "z": 10.79,
      "rotation": 0,
      "width": 1.2,
      "depth": 1,
      "height": 1.8,
      "parentId": "eq-4d1d64d0-b5bc-4767-8ade-4462849a9fbe",
      "junction": {
        "x": 0,
        "z": 0
      },
      "connection": {
        "diameter": 0.2,
        "color": "#2563eb"
      }
    },
    {
      "id": "eq-726afbc1-7f75-4dd2-9cc4-afe8b7669ce9",
      "type": "distribution",
      "code": "LV-01",
      "name": "저압 배전반",
      "x": 0.65,
      "z": -16.57,
      "rotation": 0,
      "width": 2.4,
      "depth": 0.9,
      "height": 2.2,
      "parentId": "eq-504689bf-96aa-4ddf-81f8-ff32dd237155",
      "connection": {
        "diameter": 0.2,
        "color": "#2563eb",
        "bends": [
          {
            "x": 0.23,
            "z": 10.79
          },
          {
            "x": 0.23,
            "z": 7.31
          },
          {
            "x": 1.96,
            "z": 7.31
          },
          {
            "x": 1.96,
            "z": 3.56
          },
          {
            "x": -0.57,
            "z": 3.56
          },
          {
            "x": -0.57,
            "z": -0.23
          },
          {
            "x": 0.65,
            "z": -0.23
          }
        ],
        "end": {
          "x": 0,
          "z": 0
        }
      }
    }
  ]
};
