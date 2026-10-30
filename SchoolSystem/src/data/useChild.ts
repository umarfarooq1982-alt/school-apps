import { useShared, useSession } from '../store';
import { Child, CHILDREN, STUDENT } from './school';

// The child the screens are showing: the parent's selected child, or the
// signed-in student.
export function useCurrentChild(): Child {
  const { role } = useSession();
  const [id] = useShared('parent.childId', CHILDREN[0].id);
  if (role !== 'parent') {
    return STUDENT;
  }
  return CHILDREN.find(c => c.id === id) ?? CHILDREN[0];
}

export function useSelectChild() {
  const [id, setId] = useShared('parent.childId', CHILDREN[0].id);
  return [id, setId] as const;
}
