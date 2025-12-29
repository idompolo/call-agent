'use client'

import { useState } from 'react'
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter,
  Badge,
  StatusIndicator 
} from '@/components/ui/design-system'

export default function DesignShowcase() {
  const [darkMode, setDarkMode] = useState(false)

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        {/* Modern Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 gradient-mesh opacity-30" />
          <div className="relative container mx-auto px-6 py-24">
            <div className="text-center space-y-6">
              <Badge variant="info" size="lg" className="mb-4">
                디자인 시스템 v2.0
              </Badge>
              <h1 className="text-5xl font-bold text-gradient">
                현대적인 디자인 시스템
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                일관성 있고 아름다운 UI를 위한 완벽한 디자인 시스템
              </p>
              <div className="flex gap-4 justify-center pt-6">
                <Button variant="gradient" size="lg">
                  시작하기
                </Button>
                <Button variant="outline" size="lg" onClick={() => setDarkMode(!darkMode)}>
                  {darkMode ? '라이트 모드' : '다크 모드'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Components Showcase */}
        <div className="container mx-auto px-6 py-16 space-y-16">
          
          {/* Buttons Section */}
          <section>
            <h2 className="text-3xl font-bold mb-8">버튼 컴포넌트</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Primary Buttons</CardTitle>
                  <CardDescription>주요 액션을 위한 버튼</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button size="sm">Small</Button>
                    <Button size="md">Medium</Button>
                    <Button size="lg">Large</Button>
                  </div>
                  <Button variant="gradient" className="w-full">
                    Gradient Button
                  </Button>
                  <Button loading className="w-full">
                    Loading State
                  </Button>
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardHeader>
                  <CardTitle>Glass Morphism</CardTitle>
                  <CardDescription>현대적인 글래스 효과</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="ghost">Ghost Button</Button>
                  <Button variant="outline">Outline Button</Button>
                  <Button variant="link">Link Button</Button>
                </CardContent>
              </Card>

              <Card hover="lift">
                <CardHeader>
                  <CardTitle>Interactive Card</CardTitle>
                  <CardDescription>호버 효과가 있는 카드</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="destructive" className="w-full">
                    Destructive Action
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Status Indicators */}
          <section>
            <h2 className="text-3xl font-bold mb-8">상태 표시기</h2>
            <Card>
              <CardHeader>
                <CardTitle>주문 상태 시스템</CardTitle>
                <CardDescription>실시간 주문 상태를 표시하는 컴포넌트</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-medium mb-3">Small Size</h3>
                    <StatusIndicator status="waiting" size="sm" />
                    <StatusIndicator status="accepted" size="sm" />
                    <StatusIndicator status="reserved" size="sm" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium mb-3">Medium Size</h3>
                    <StatusIndicator status="processing" size="md" />
                    <StatusIndicator status="completed" size="md" />
                    <StatusIndicator status="cancelled" size="md" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium mb-3">Dot Only</h3>
                    <div className="flex gap-2">
                      <StatusIndicator status="waiting" showText={false} />
                      <StatusIndicator status="accepted" showText={false} />
                      <StatusIndicator status="reserved" showText={false} />
                      <StatusIndicator status="cancelled" showText={false} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Badges */}
          <section>
            <h2 className="text-3xl font-bold mb-8">배지 시스템</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>상태 배지</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="destructive">Error</Badge>
                  <Badge variant="info">Info</Badge>
                  <Badge variant="purple">Purple</Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>배지 with Dot</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Badge variant="success" dot>온라인</Badge>
                  <Badge variant="warning" dot>대기중</Badge>
                  <Badge variant="destructive" dot>오프라인</Badge>
                  <Badge variant="info" dot dotColor="#3b82f6">활성</Badge>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Color Palette */}
          <section>
            <h2 className="text-3xl font-bold mb-8">색상 팔레트</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Primary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-12 rounded-lg bg-primary" />
                    <div className="h-12 rounded-lg bg-primary/80" />
                    <div className="h-12 rounded-lg bg-primary/60" />
                    <div className="h-12 rounded-lg bg-primary/40" />
                    <div className="h-12 rounded-lg bg-primary/20" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Success</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-12 rounded-lg bg-green-500" />
                    <div className="h-12 rounded-lg bg-green-400" />
                    <div className="h-12 rounded-lg bg-green-300" />
                    <div className="h-12 rounded-lg bg-green-200" />
                    <div className="h-12 rounded-lg bg-green-100" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Warning</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-12 rounded-lg bg-yellow-500" />
                    <div className="h-12 rounded-lg bg-yellow-400" />
                    <div className="h-12 rounded-lg bg-yellow-300" />
                    <div className="h-12 rounded-lg bg-yellow-200" />
                    <div className="h-12 rounded-lg bg-yellow-100" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Danger</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-12 rounded-lg bg-red-500" />
                    <div className="h-12 rounded-lg bg-red-400" />
                    <div className="h-12 rounded-lg bg-red-300" />
                    <div className="h-12 rounded-lg bg-red-200" />
                    <div className="h-12 rounded-lg bg-red-100" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Typography */}
          <section>
            <h2 className="text-3xl font-bold mb-8">타이포그래피</h2>
            <Card>
              <CardContent className="space-y-4 pt-6">
                <h1 className="text-5xl font-bold">Heading 1 - 5xl Bold</h1>
                <h2 className="text-4xl font-semibold">Heading 2 - 4xl Semibold</h2>
                <h3 className="text-3xl font-medium">Heading 3 - 3xl Medium</h3>
                <h4 className="text-2xl font-medium">Heading 4 - 2xl Medium</h4>
                <h5 className="text-xl font-medium">Heading 5 - xl Medium</h5>
                <p className="text-lg text-muted-foreground">
                  Body Large - 이것은 본문 텍스트입니다. Pretendard 폰트를 사용하여 깔끔하고 읽기 쉬운 텍스트를 제공합니다.
                </p>
                <p className="text-base">
                  Body Default - 기본 본문 텍스트입니다. 대부분의 콘텐츠에 사용됩니다.
                </p>
                <p className="text-sm text-muted-foreground">
                  Small Text - 보조 텍스트나 캡션에 사용됩니다.
                </p>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Footer */}
        <footer className="border-t mt-20">
          <div className="container mx-auto px-6 py-12">
            <div className="text-center text-muted-foreground">
              <p>© 2024 FTNH Web Client - Modern Design System</p>
              <p className="mt-2">React + Next.js + Tailwind CSS로 구축</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}