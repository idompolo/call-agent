'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronRight, ExternalLink } from 'lucide-react';

interface ReleaseNote {
  version: string;
  releaseDate: string;
  notes: string;
}

const STORAGE_KEY = 'app-last-seen-version';

export function WhatsNewModal() {
  const [open, setOpen] = useState(false);
  const [releaseInfo, setReleaseInfo] = useState<ReleaseNote | null>(null);
  const [loading, setLoading] = useState(true);

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  useEffect(() => {
    if (!isElectron) return;

    const checkForNewVersion = async () => {
      try {
        // 현재 앱 버전 가져오기
        const currentVersion = await window.electronAPI?.getAppVersion();
        if (!currentVersion) return;

        // 마지막으로 본 버전 확인
        const lastSeenVersion = localStorage.getItem(STORAGE_KEY);

        // 첫 실행이거나 버전이 다르면 릴리즈 노트 표시
        if (lastSeenVersion && lastSeenVersion !== currentVersion) {
          // 릴리즈 노트 가져오기
          const notes = await window.electronAPI?.getReleaseNotes?.();

          if (notes) {
            setReleaseInfo({
              version: currentVersion,
              releaseDate: notes.releaseDate || new Date().toISOString(),
              notes: notes.releaseNotes || '',
            });
            setOpen(true);
          }
        }

        // 현재 버전 저장
        localStorage.setItem(STORAGE_KEY, currentVersion);
      } catch (error) {
        console.error('[WhatsNew] Failed to check version:', error);
      } finally {
        setLoading(false);
      }
    };

    // 앱 시작 후 잠시 대기 후 체크
    const timer = setTimeout(checkForNewVersion, 1500);
    return () => clearTimeout(timer);
  }, [isElectron]);

  const handleClose = () => {
    setOpen(false);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const parseReleaseNotes = (notes: string): string[] => {
    if (!notes) return [];

    // 마크다운 형식의 릴리즈 노트 파싱
    // - 또는 * 로 시작하는 항목들을 추출
    const lines = notes.split('\n');
    const items: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        items.push(trimmed.substring(2));
      } else if (trimmed.startsWith('• ')) {
        items.push(trimmed.substring(2));
      } else if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('##')) {
        // 헤더가 아닌 일반 텍스트도 포함
        if (items.length === 0 || trimmed.length > 3) {
          items.push(trimmed);
        }
      }
    }

    return items.length > 0 ? items : [notes];
  };

  if (!isElectron || loading) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md" onClose={handleClose}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">새로운 기능</DialogTitle>
              {releaseInfo && (
                <p className="mt-0.5 text-sm text-slate-400">
                  v{releaseInfo.version} • {formatDate(releaseInfo.releaseDate)}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 max-h-[300px] overflow-y-auto">
          {releaseInfo?.notes ? (
            <ul className="space-y-3">
              {parseReleaseNotes(releaseInfo.notes).map((note, index) => (
                <li key={index} className="flex items-start gap-2">
                  <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
                  <span className="text-sm text-slate-300">{note}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">
              새로운 버전이 설치되었습니다. 최신 기능과 개선사항을 확인하세요.
            </p>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-slate-300"
            onClick={() => {
              window.open('https://github.com/idompolo/call-agent/releases', '_blank');
            }}
          >
            <ExternalLink className="mr-1.5 h-4 w-4" />
            전체 릴리즈 노트
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 text-white hover:bg-blue-500"
            onClick={handleClose}
          >
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
