export default function FontTestPage() {
  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">폰트 렌더링 테스트 / Font Rendering Test</h1>
      
      {/* Weight Test */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Font Weight Test (굵기 테스트)</h2>
        <div className="space-y-2">
          <p className="font-thin">100: 가나다라마바사 ABCDEFGHIJKLMNOP 1234567890</p>
          <p className="font-extralight">200: 가나다라마바사 ABCDEFGHIJKLMNOP 1234567890</p>
          <p className="font-light">300: 가나다라마바사 ABCDEFGHIJKLMNOP 1234567890</p>
          <p className="font-normal">400: 가나다라마바사 ABCDEFGHIJKLMNOP 1234567890</p>
          <p className="font-medium">500: 가나다라마바사 ABCDEFGHIJKLMNOP 1234567890</p>
          <p className="font-semibold">600: 가나다라마바사 ABCDEFGHIJKLMNOP 1234567890</p>
          <p className="font-bold">700: 가나다라마바사 ABCDEFGHIJKLMNOP 1234567890</p>
          <p className="font-extrabold">800: 가나다라마바사 ABCDEFGHIJKLMNOP 1234567890</p>
          <p className="font-black">900: 가나다라마바사 ABCDEFGHIJKLMNOP 1234567890</p>
        </div>
      </section>

      {/* Size Test */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Font Size Test (크기 테스트)</h2>
        <div className="space-y-2">
          <p className="text-xs">12px: 택시 관제 시스템 Taxi Control System</p>
          <p className="text-sm">14px: 택시 관제 시스템 Taxi Control System</p>
          <p className="text-base">16px: 택시 관제 시스템 Taxi Control System</p>
          <p className="text-lg">18px: 택시 관제 시스템 Taxi Control System</p>
          <p className="text-xl">20px: 택시 관제 시스템 Taxi Control System</p>
          <p className="text-2xl">24px: 택시 관제 시스템 Taxi Control System</p>
          <p className="text-3xl">30px: 택시 관제 시스템 Taxi Control System</p>
        </div>
      </section>

      {/* Mixed Content Test */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Mixed Content (한영 혼용)</h2>
        <div className="space-y-3">
          <p className="text-base">
            서울특별시 강남구 테헤란로 123번지에서 Gangnam Station으로 이동합니다.
          </p>
          <p className="text-base">
            주문번호 #12345 | 고객명: 홍길동 | Status: Active | 요금: ₩15,000
          </p>
          <p className="text-base">
            2024년 1월 20일 PM 3:45 | Driver ID: DRV-2024-0120 | 차량번호: 12가3456
          </p>
        </div>
      </section>

      {/* Number Display Test */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Tabular Numbers (숫자 정렬)</h2>
        <div className="font-mono tabular-nums space-y-1">
          <div>111,111.11</div>
          <div>222,222.22</div>
          <div>333,333.33</div>
          <div>999,999.99</div>
        </div>
      </section>

      {/* Special Characters */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Special Characters (특수문자)</h2>
        <p className="text-base">
          {`!"#$%&'()*+,-./:;<=>?@[\\]^_\`{|}~`}
          {' '}
          ←↑→↓ ♠♣♥♦ ☎☏✉✔✘ ①②③④⑤ ㈜㈱㉠㉡㉢
        </p>
      </section>

      {/* Readability Test */}
      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Readability Test (가독성 테스트)</h2>
        <div className="space-y-3">
          <p className="text-sm leading-tight">
            줄간격 좁음: 택시 관제 시스템은 실시간으로 차량의 위치를 추적하고 효율적인 배차를 지원합니다.
            The taxi dispatch system tracks vehicle locations in real-time and supports efficient dispatching.
          </p>
          <p className="text-sm leading-normal">
            줄간격 보통: 택시 관제 시스템은 실시간으로 차량의 위치를 추적하고 효율적인 배차를 지원합니다.
            The taxi dispatch system tracks vehicle locations in real-time and supports efficient dispatching.
          </p>
          <p className="text-sm leading-relaxed">
            줄간격 넓음: 택시 관제 시스템은 실시간으로 차량의 위치를 추적하고 효율적인 배차를 지원합니다.
            The taxi dispatch system tracks vehicle locations in real-time and supports efficient dispatching.
          </p>
        </div>
      </section>
    </div>
  )
}