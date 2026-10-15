import type { IconType } from "react-icons";
import {
  MdArrowBack,
  MdAdd,
  MdArrowForward,
  MdCheckCircle,
  MdChair,
  MdClose,
  MdCloudOff,
  MdDeleteOutline,
  MdHome,
  MdInfo,
  MdKeyboardArrowDown,
  MdLink,
  MdLockOutline,
  MdLogin,
  MdLogout,
  MdLocationOn,
  MdNotes,
  MdOutlineDeliveryDining,
  MdOutlineShoppingCart,
  MdOutlineWifiTethering,
  MdPeopleOutline,
  MdPersonOutline,
  MdPhone,
  MdQrCodeScanner,
  MdReceiptLong,
  MdRefresh,
  MdRemove,
  MdRestaurant,
  MdSearch,
  MdSend,
  MdTableRestaurant,
  MdWarningAmber,
} from "react-icons/md";
import { BiSolidDish } from "react-icons/bi";
import { FaHandHoldingMedical } from "react-icons/fa6";
import { GiCancel } from "react-icons/gi";
import { LiaFileInvoiceDollarSolid } from "react-icons/lia";
import { PiCookingPotBold } from "react-icons/pi";
import { RiRestaurantLine } from "react-icons/ri";

export const ArrowBackIcon = MdArrowBack;
export const AddIcon = MdAdd;
export const ChairIcon = MdChair;
export const CheckCircleIcon = MdCheckCircle;
export const CloseIcon = MdClose;
export const DeleteIcon = MdDeleteOutline;
export const ChevronDownIcon = MdKeyboardArrowDown;
export const CloudOffIcon = MdCloudOff;
export const HomeIcon = MdHome;
export const InfoIcon = MdInfo;
export const LinkIcon = MdLink;
export const ListIcon = MdReceiptLong;
export const LocationIcon = MdLocationOn;
export const LockIcon = MdLockOutline;
export const LoginIcon = MdLogin;
export const LogoutIcon = MdLogout;
export const PersonIcon = MdPersonOutline;
export const PhoneIcon = MdPhone;
export const TableIcon = MdTableRestaurant;
export const UsersIcon = MdPeopleOutline;
export const MinusIcon = MdRemove;
export const NextIcon = MdArrowForward;
export const NotesIcon = MdNotes;
export const SendIcon = MdSend;
export const ReceiptIcon = MdReceiptLong;
export const ShoppingCartIcon = MdOutlineShoppingCart;
export const WifiIcon = MdOutlineWifiTethering;
export const QrCodeScannerIcon = MdQrCodeScanner;
export const RefreshIcon = MdRefresh;
export const RestaurantIcon = MdRestaurant;
export const SearchIcon = MdSearch;
export const WarningIcon = MdWarningAmber;
export const MapPinIcon: IconType = MdLocationOn;

export const ORDER_TYPE_ICONS: Record<string, IconType> = {
  ONSITE: MdTableRestaurant,
  DELIVERY: MdOutlineDeliveryDining,
  CARRY: FaHandHoldingMedical,
};

export const ORDER_STATUS_ICONS: Record<string, IconType> = {
  PENDING: BiSolidDish,
  PREPARATION: PiCookingPotBold,
  DELIVERED: RiRestaurantLine,
  CANCELED: GiCancel,
  INVOICED: LiaFileInvoiceDollarSolid,
};

export function OrderTypeIcon({ type, className = "w-5 h-5" }: { type: string; className?: string }) {
  const Cmp = ORDER_TYPE_ICONS[type] ?? MdRestaurant;
  return <Cmp className={className} />;
}

export function OrderStatusIcon({
  status,
  className = "w-5 h-5",
}: {
  status: string;
  className?: string;
}) {
  const Cmp = ORDER_STATUS_ICONS[status] ?? MdWarningAmber;
  return <Cmp className={className} />;
}