/**
 * MQTT 메시지 파서 (Flutter Order 모델 기반)
 *
 * Flutter 프로젝트의 pipe-delimited 메시지 포맷을 파싱하여
 * TypeScript 객체로 변환합니다.
 */

export interface ParsedOrder {
  orderId: string;
  status: 'pending' | 'dispatching' | 'accepted' | 'riding' | 'completed' | 'cancelled';
  orderType: 'normal' | 'reserve' | 'app' | 'ai';
  customer: {
    name: string;
    phone: string;
    secondaryPhone?: string;
  };
  pickup: {
    address: string;
    addressDetail?: string;
    dong?: string;
    lat?: number;
    lng?: number;
  };
  dropoff: {
    address: string;
    addressDetail?: string;
    dong?: string;
    lat?: number;
    lng?: number;
  };
  driver?: {
    id: string;
    name: string;
    phone: string;
    carNumber: string;
    carType?: string;
  };
  camp?: {
    id: string;
    name: string;
  };
  fare?: {
    estimated?: number;
    final?: number;
    paymentMethod?: 'cash' | 'card' | 'app';
  };
  memo?: string;
  request?: string;
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  agentId?: string;
  agentName?: string;
  source?: 'phone' | 'app' | 'web' | 'ai';
  reservedAt?: Date;
  rawData?: string;
}

export interface ParsedDriverLocation {
  driverId: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  status: 'available' | 'busy' | 'offline' | 'break';
  lastUpdated: Date;
}

/**
 * OrderParser - MQTT 메시지 파싱 유틸리티
 *
 * Flutter의 Order.fromAdd(), Order.fromAccept() 등과 동일한 로직 구현
 */
export class OrderParser {
  /**
   * 신규 주문 파싱 (web/addOrder 토픽)
   *
   * Flutter Format:
   * orderId|custTel|custNm|place|dong|placeDetail|destPlace|destDong|destPlaceDetail|
   * memo|carType|campId|campNm|agentId|agentNm|orderType|reserveTime|lat|lng|destLat|destLng
   */
  static fromAdd(rawData: string): Partial<ParsedOrder> {
    const parts = rawData.split('|');

    // 좌표 파싱 헬퍼
    const parseCoord = (val: string | undefined): number | undefined => {
      if (!val) return undefined;
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    };

    // 주문 타입 결정
    let orderType: ParsedOrder['orderType'] = 'normal';
    if (parts[15]) {
      const type = parts[15].toLowerCase();
      if (type === 'reserve' || type === '예약') orderType = 'reserve';
      else if (type === 'app') orderType = 'app';
      else if (type === 'ai') orderType = 'ai';
    }

    return {
      orderId: parts[0] || '',
      status: 'pending',
      orderType,
      customer: {
        phone: parts[1] || '',
        name: parts[2] || '',
      },
      pickup: {
        address: parts[3] || '',
        dong: parts[4] || '',
        addressDetail: parts[5] || '',
        lat: parseCoord(parts[17]),
        lng: parseCoord(parts[18]),
      },
      dropoff: {
        address: parts[6] || '',
        dong: parts[7] || '',
        addressDetail: parts[8] || '',
        lat: parseCoord(parts[19]),
        lng: parseCoord(parts[20]),
      },
      memo: parts[9] || '',
      camp:
        parts[11] && parts[12]
          ? {
              id: parts[11],
              name: parts[12],
            }
          : undefined,
      agentId: parts[13] || undefined,
      agentName: parts[14] || undefined,
      reservedAt: parts[16] ? new Date(parts[16]) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      rawData,
    };
  }

  /**
   * 배차 완료 파싱 (web/acceptedOrder 토픽)
   *
   * Flutter Format:
   * orderId|driverId|driverNm|driverTel|carNo|carType|lat|lng|eta
   */
  static fromAccept(rawData: string): Partial<ParsedOrder> {
    const parts = rawData.split('|');

    return {
      orderId: parts[0] || '',
      status: 'accepted',
      driver: {
        id: parts[1] || '',
        name: parts[2] || '',
        phone: parts[3] || '',
        carNumber: parts[4] || '',
        carType: parts[5] || '',
      },
      acceptedAt: new Date(),
      updatedAt: new Date(),
      rawData,
    };
  }

  /**
   * 취소 파싱 (web/cancelOrder 토픽)
   *
   * Flutter Format:
   * orderId|reason|cancelledBy|timestamp
   */
  static fromCancel(rawData: string): Partial<ParsedOrder> {
    const parts = rawData.split('|');

    return {
      orderId: parts[0] || '',
      status: 'cancelled',
      memo: parts[1] || '', // 취소 사유
      cancelledAt: new Date(),
      updatedAt: new Date(),
      rawData,
    };
  }

  /**
   * 완료 파싱 (web/completeOrder 토픽)
   *
   * Flutter Format:
   * orderId|fare|paymentMethod|distance|duration|timestamp
   */
  static fromComplete(rawData: string): Partial<ParsedOrder> {
    const parts = rawData.split('|');

    let paymentMethod: 'cash' | 'card' | 'app' = 'cash';
    if (parts[2]) {
      const method = parts[2].toLowerCase();
      if (method === 'card' || method === '카드') paymentMethod = 'card';
      else if (method === 'app' || method === '앱') paymentMethod = 'app';
    }

    return {
      orderId: parts[0] || '',
      status: 'completed',
      fare: {
        final: parts[1] ? parseInt(parts[1], 10) : undefined,
        paymentMethod,
      },
      completedAt: new Date(),
      updatedAt: new Date(),
      rawData,
    };
  }

  /**
   * 탑승 시작 파싱 (web/ridingOrder 토픽)
   *
   * Flutter Format:
   * orderId|timestamp|lat|lng
   */
  static fromRiding(rawData: string): Partial<ParsedOrder> {
    const parts = rawData.split('|');

    return {
      orderId: parts[0] || '',
      status: 'riding',
      updatedAt: new Date(),
      rawData,
    };
  }

  /**
   * GPS 위치 파싱 (ftnh:drv:gps 토픽)
   *
   * 실제 메시지 형식 (웹과 동일):
   * 기사로그인아이디|drvNo|lat|lng|companyid|city|기사상태
   *
   * 또는 JSON 형식:
   * {"driverId":"...", "lat":37.5, "lng":127.0, ...}
   */
  static parseGPS(rawData: string): ParsedDriverLocation | null {
    // JSON 형식 시도
    try {
      const data = JSON.parse(rawData);
      return {
        driverId: data.driverId || data.drvNo || data.id || '',
        lat: parseFloat(data.lat) || 0,
        lng: parseFloat(data.lng) || 0,
        heading: parseFloat(data.heading) || 0,
        speed: parseFloat(data.speed) || 0,
        status: this.parseDriverStatus(data.status),
        lastUpdated: new Date(),
      };
    } catch {
      // Pipe-delimited 형식: 기사로그인아이디|drvNo|lat|lng|companyid|city|기사상태
      const parts = rawData.split('|');
      if (parts.length < 7) return null;

      const drvNo = parts[1];
      const lat = parseFloat(parts[2]);
      const lng = parseFloat(parts[3]);

      // 유효성 검사
      if (!drvNo || isNaN(lat) || isNaN(lng)) {
        return null;
      }

      return {
        driverId: drvNo,
        lat,
        lng,
        heading: 0,
        speed: 0,
        status: this.parseDriverStatus(parts[6]),
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * 드라이버 상태 파싱
   */
  private static parseDriverStatus(
    status: string | undefined
  ): ParsedDriverLocation['status'] {
    if (!status) return 'offline';

    const s = status.toLowerCase();
    if (s === 'available' || s === '대기' || s === '1') return 'available';
    if (s === 'busy' || s === '운행' || s === '2') return 'busy';
    if (s === 'break' || s === '휴식' || s === '3') return 'break';
    return 'offline';
  }

  /**
   * 범용 주문 업데이트 파싱
   * JSON 또는 pipe-delimited 자동 감지
   */
  static parseUpdate(rawData: string): Partial<ParsedOrder> & { orderId: string } {
    try {
      // JSON 형식 시도
      const data = JSON.parse(rawData);
      return {
        orderId: data.orderId || data.id || '',
        status: data.status,
        ...data,
        updatedAt: new Date(),
        rawData,
      };
    } catch {
      // Pipe-delimited 형식 - 첫 번째 필드가 orderId
      const parts = rawData.split('|');
      return {
        orderId: parts[0] || '',
        updatedAt: new Date(),
        rawData,
      };
    }
  }
}

export default OrderParser;
