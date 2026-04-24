import ModalLayout from '@/src/components/modals/layout';
import Modal from '@/src/components/modals/modal';
import { Card, CardContent } from '@/src/components/ui/card';
import { CreditCard, Calendar, AlertCircle, Pencil } from 'lucide-react';
import { useState } from 'react';

type MainCardProps = {
  title: string;
  subtitle?: string;
  items: SubscriptionData[];
  icon?: React.ReactNode;
  children?: React.ReactNode;
  handleCancelSubscription: (subscriptionId: string) => void;
  handleDeleteSubscription: (subscriptionId: string, isMock?: boolean) => void;
};

type SubscriptionData = {
  label: string;
  service: string;
  price: number;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  nextBilling: string;
  lastPayment: string;
  subscriptionId: string;
  category: string;
};

type SubscriptionRowProps = SubscriptionData & {
  onServiceClick: () => void;
};

function SubscriptionRow({
  label,
  service,
  price,
  status,
  nextBilling,
  lastPayment,
  onServiceClick
}: SubscriptionRowProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50';
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      case 'expired':
        return 'text-gray-600 bg-gray-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className='grid w-full grid-cols-[2fr_1.5fr_1.5fr_2fr_auto] items-center rounded-2xl bg-gray-100 p-3 shadow-sm'>
      <div
        className='flex cursor-pointer items-center gap-2'
        onClick={onServiceClick}
      >
        <div className='flex h-8 w-8 items-center justify-center rounded-full bg-blue-100'>
          <CreditCard className='h-4 w-4 text-blue-600' />
        </div>
        <div className='flex flex-col'>
          <span className='text-sm font-semibold text-gray-900'>
            {service}
          </span>
          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize ${getStatusColor(status)}`}>
            {status}
          </span>
        </div>
      </div>

      <span className='text-sm font-semibold text-gray-900'>
        ${price.toFixed(2)}/mo
      </span>
      
      <div className='flex items-center gap-1'>
        <Calendar className='h-3 w-3 text-gray-500' />
        <span className='text-sm font-semibold text-gray-900'>
          {new Date(nextBilling).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          })}
        </span>
      </div>
      
      <span className='text-sm font-semibold text-gray-900'>
        Last payment {lastPayment} ago
      </span>
      
      <div className='flex items-center justify-center gap-3'>
        <button 
          className='p-1 hover:text-blue-600 transition-colors' 
          title='Edit subscription'
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button 
          className='p-1 hover:text-red-600 transition-colors' 
          title='Cancel subscription'
        >
          <AlertCircle className="h-4 w-4" />
        </button>
        <button 
          className='font-bold hover:text-gray-600 px-1' 
          title='More options'
        >
          ⋮
        </button>
      </div>
    </div>
  );
}

export default function MainCard({
  title,
  subtitle,
  items,
  icon,
  children,
  handleCancelSubscription,
  handleDeleteSubscription,
  ...props
}: MainCardProps & React.ComponentProps<typeof Card>) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionData | null>(null);

  const handleServiceClick = (subscription: SubscriptionData) => {
    setSelectedSubscription(subscription);
    setModalOpen(true);
  };

  const totalActiveSubscriptions = items.filter(item => item.status === 'active').length;
  const totalMonthlyCost = items
    .filter(item => item.status === 'active')
    .reduce((sum, item) => sum + item.price, 0);

  return (
    <Card {...props} className='flex w-full gap-2 p-4'>
      <CardContent className='flex flex-col gap-2'>
        <div className='flex items-center justify-between gap-2.5'>
          <h2 className='text-lg font-bold font-medium'>{title}</h2>
          <span className='text-gray-400 font-semibold'>•</span>
          <div className='flex items-center gap-4'>
            <div className='flex items-center gap-1 text-sm'>
              <CreditCard className='h-3 w-3 font-bold text-blue-500' />
              <span className='font-semibold'>{totalActiveSubscriptions} active</span>
            </div>
            <div className='flex items-center gap-1 text-sm'>
              <span className='font-bold text-green-600'>${totalMonthlyCost.toFixed(2)}</span>
              <span className='font-semibold text-gray-600'>/month</span>
            </div>
          </div>
          <div className='ml-auto flex items-center gap-2 text-sm font-semibold text-blue-500 drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]'>
            {icon && <span className='text-lg'>{icon}</span>}
            {subtitle}
          </div>
          <button className='ml-4 font-bold hover:text-gray-600 p-1' title='More options'>
            ⋮
          </button>
        </div>

        {children}

        {items.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-500">
            No subscriptions found
          </div>
        ) : (
          items.map((item, i) => (
            <SubscriptionRow
              key={i}
              {...item}
              onServiceClick={() => handleServiceClick(item)}
            />
          ))
        )}

        {selectedSubscription && (
          <Modal isOpen={modalOpen}>
            <ModalLayout setModalOpen={setModalOpen} />
          </Modal>
        )}
      </CardContent>
    </Card>
  );
}