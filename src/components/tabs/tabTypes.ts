import type { User } from 'firebase/auth';
import type { GroupDoc, ModuleId, ModulesState, TabId } from '../../types/kaskelompok';

export interface TabProps {
  group: GroupDoc;
  modules: ModulesState;
  moduleExists: Record<ModuleId, boolean>;
  user: User;
  isEditor: boolean;
  onOpenTab: (tab: TabId) => void;
  onOpenLightbox: (src: string, title?: string, subtitle?: string) => void;
  onToast: (message: string, tone?: 'info' | 'success' | 'error') => void;
  onRequestEditorPin: () => void;
}
