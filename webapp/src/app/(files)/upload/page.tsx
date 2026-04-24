'use client';

import { useState } from 'react';
import Modal from '@/src/components/modals/modal';
import UploadModalLayout from '@/src/components/modals/layout';
import UploadModal from '@/src/components/modals/layout';


export default function Page() {
  const [open, setOpen] = useState(true);

  return (
    <Modal isOpen={open}>
      <UploadModal setModalOpen={setOpen} />
    </Modal>
  );
}