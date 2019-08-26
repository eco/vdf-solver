##############################################################################
# Copyright 2014 Intel Corporation                                           #
#                                                                            #
# Licensed under the Apache License, Version 2.0 (the "License");            #
# you may not use this file except in compliance with the License.           #
# You may obtain a copy of the License at                                    #
#                                                                            #
#    http://www.apache.org/licenses/LICENSE-2.0                              #
#                                                                            #
# Unless required by applicable law or agreed to in writing, software        #
# distributed under the License is distributed on an "AS IS" BASIS,          #
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.   #
# See the License for the specific language governing permissions and        #
# limitations under the License.                                             #
#                                                                            #
##############################################################################
#                                                                            #
#  Developers and authors:                                                   #
#  Shay Gueron (1, 2), and Vlad Krasnov (1)                                  #
#  (1) Intel Corporation, Israel Development Center                          #
#  (2) University of Haifa                                                   #
#  Reference:                                                                #
#  S.Gueron and V.Krasnov, "Software Implementation of Modular Exponentiation#
#  , Using Advanced Vector Instructions Architectures"                       #
#                                                                            #
##############################################################################

# Prototypes of functions in this document:
# void AMM_2048_IFMA(uint64_t *rp, const uint64_t *aptr, const uint64_t *bptr, const uint64_t *nptr, uint64_t n0);
# void norm2red52_2048(uint64_t *res, uint64_t *a);

.text
.p2align 6

.LpermMask0:
.word 0,1,2,3, 3,4,5,6, 6,7,8,9, 9,10,11,12, 13,14,15,16, 16,17,18,19, 19,20,21,22, 22,23,24,25

.LshiftMask0:
.quad 0,4,8,12,0,4,8,12

.LandMask:
.quad 0xfffffffffffff

################################################################################
.globl norm2red52_2048
.p2align 5
norm2red52_2048:
	mov	$0xFFFFFF, %eax
	kmovd	%eax, %k1

	vmovdqa64	.LpermMask0(%rip), %zmm0
	vmovdqa64	.LshiftMask0(%rip), %zmm1
	vpbroadcastq	.LandMask(%rip), %zmm10

	vpermw	52*0(%rsi), %zmm0, %zmm2
	vpermw	52*1(%rsi), %zmm0, %zmm3
	vpermw	52*2(%rsi), %zmm0, %zmm4
	vpermw	52*3(%rsi), %zmm0, %zmm5
	vmovdqu16	52*4(%rsi), %zmm6{%k1}{z}
	vpermw	%zmm6, %zmm0, %zmm6

	vpsrlvq	%zmm1, %zmm2, %zmm2
	vpsrlvq	%zmm1, %zmm3, %zmm3
	vpsrlvq	%zmm1, %zmm4, %zmm4
	vpsrlvq	%zmm1, %zmm5, %zmm5
	vpsrlvq	%zmm1, %zmm6, %zmm6

	vpandq	%zmm10, %zmm2, %zmm2
	vpandq	%zmm10, %zmm3, %zmm3
	vpandq	%zmm10, %zmm4, %zmm4
	vpandq	%zmm10, %zmm5, %zmm5
	vpandq	%zmm10, %zmm6, %zmm6

	vmovdqu64	%zmm2, 64*0(%rdi)
	vmovdqu64	%zmm3, 64*1(%rdi)
	vmovdqu64	%zmm4, 64*2(%rdi)
	vmovdqu64	%zmm5, 64*3(%rdi)
	vmovdqu64	%zmm6, 64*4(%rdi)
	ret

################################################################################
#void AMM_2048_IFMA(
.globl AMM_2048_IFMA
.p2align 5
AMM_2048_IFMA:
	push	%rbx
	push	%r12
	push	%r13
	push	%r14
	push	%r15

	mov	%rdx, %rax

	mov	$1, %r11
	mov	$0x7f, %r12
	kmovq	%r11, %k1
	kmovq	%r12, %k2

	mov	.LandMask(%rip), %r15
	vpbroadcastq	%r15, %zmm31
	vpxorq	%zmm30, %zmm30, %zmm30

	# Load operands A into registers. A[0] is stored in ALU register, in order to compensate for the latency of IFMA when computing (A*B)[0] * K0
	vmovdqu64	8*1+64*0(%rsi), %zmm0
	vmovdqu64	8*1+64*1(%rsi), %zmm20
	vmovdqu64	8*1+64*2(%rsi), %zmm2
	vmovdqu64	8*1+64*3(%rsi), %zmm3
	vmovdqu64	8*1+64*4(%rsi), %zmm4{%k2}{z}
	mov	8*0(%rsi), %rsi

	# Load the modulii
	vmovdqu64	8*1+64*0(%rcx), %zmm5
	vmovdqu64	8*1+64*1(%rcx), %zmm6
	vmovdqu64	8*1+64*2(%rcx), %zmm7
	vmovdqu64	8*1+64*3(%rcx), %zmm8
	vmovdqu64	8*1+64*4(%rcx), %zmm9{%k2}{z}
	mov	8*0(%rcx), %rcx

	# Prepare the accumulators
	vpxorq	%zmm10, %zmm10, %zmm10
	vpxorq	%zmm11, %zmm11, %zmm11
	vpxorq	%zmm12, %zmm12, %zmm12
	vpxorq	%zmm13, %zmm13, %zmm13
	vpxorq	%zmm14, %zmm14, %zmm14
	vpxorq	%zmm18, %zmm18, %zmm18
	vpxorq	%zmm16, %zmm16, %zmm16


	# Hoist first low mul (high B and Y will be 0)
	mov	%rsi, %rdx
	mov	(%rax), %r14
	lea	8(%rax), %rax
	vpbroadcastq	%r14, %zmm18
	mulx	%r14, %r9, %r13

	mov	%r9, %rdx
	mulx	%r8, %rdx, %r11
	and	%r15, %rdx
	vpbroadcastq	%rdx, %zmm16

	mulx	%rcx, %r11, %r12
	add	%r11, %r9
	adc	%r12, %r13

	shrd	$52, %r13, %r9

	vpmadd52luq	%zmm18, %zmm0, %zmm10
	vpmadd52luq	%zmm18, %zmm20, %zmm11
	vpmadd52luq	%zmm18, %zmm2, %zmm12
	vpmadd52luq	%zmm18, %zmm3, %zmm13
	vpmadd52luq	%zmm18, %zmm4, %zmm14

	vpmadd52luq	%zmm16, %zmm5, %zmm10
	vpmadd52luq	%zmm16, %zmm6, %zmm11
	vpmadd52luq	%zmm16, %zmm7, %zmm12
	vpmadd52luq	%zmm16, %zmm8, %zmm13
	vpmadd52luq	%zmm16, %zmm9, %zmm14

	vmovq	%xmm10, %r11
	add	%r11, %r9

	mov	$39, %r10

1:
		mov	(%rax), %r14
		lea	8(%rax), %rax
		mov	%rsi, %rdx

		mulx	%r14, %r11, %r13
		add	%r11, %r9
		adc	$0, %r13

		mov	%r9, %rdx
		mulx	%r8, %rdx, %r11
		and	%r15, %rdx

		mulx	%rcx, %r11, %r12
		add	%r11, %r9
		adc	%r12, %r13

		shrd	$52, %r13, %r9


		# Shift the ACC in zmms right by a word
		valignq $1, %zmm10, %zmm11, %zmm10
		valignq $1, %zmm11, %zmm12, %zmm11
		valignq $1, %zmm12, %zmm13, %zmm12
		valignq $1, %zmm13, %zmm14, %zmm13
		valignq $1, %zmm14, %zmm30, %zmm14




		# High multiplications
		vpmadd52huq	%zmm18, %zmm0, %zmm10
		vpmadd52huq	%zmm18, %zmm20, %zmm11
		vpmadd52huq	%zmm18, %zmm2, %zmm12
		vpmadd52huq	%zmm18, %zmm3, %zmm13
		vpmadd52huq	%zmm18, %zmm4, %zmm14

		vpmadd52huq	%zmm16, %zmm5, %zmm10
		vpmadd52huq	%zmm16, %zmm6, %zmm11
		vpmadd52huq	%zmm16, %zmm7, %zmm12
		vpmadd52huq	%zmm16, %zmm8, %zmm13
		vpmadd52huq	%zmm16, %zmm9, %zmm14

		# Low multiplications
		vpbroadcastq	%r14, %zmm18
		vpbroadcastq	%rdx, %zmm16

		vpmadd52luq	%zmm18, %zmm0, %zmm10
		vpmadd52luq	%zmm18, %zmm20, %zmm11
		vpmadd52luq	%zmm18, %zmm2, %zmm12
		vpmadd52luq	%zmm18, %zmm3, %zmm13
		vpmadd52luq	%zmm18, %zmm4, %zmm14

		vpmadd52luq	%zmm16, %zmm5, %zmm10
		vpmadd52luq	%zmm16, %zmm6, %zmm11
		vpmadd52luq	%zmm16, %zmm7, %zmm12
		vpmadd52luq	%zmm16, %zmm8, %zmm13
		vpmadd52luq	%zmm16, %zmm9, %zmm14

		vmovq	%xmm10, %r11
		add	%r11, %r9


		dec	%r10
		jne 1b

	vmovq	%r9, %xmm1
	vmovdqa64	%zmm1, %zmm10{%k1}

	valignq	$7, %zmm3, %zmm4, %zmm4
	valignq	$7, %zmm2, %zmm3, %zmm3
	valignq	$7, %zmm20, %zmm2, %zmm2
	valignq	$7, %zmm0, %zmm20, %zmm20
	valignq	$7, %zmm30, %zmm0, %zmm0

	valignq	$7, %zmm8, %zmm9, %zmm9
	valignq	$7, %zmm7, %zmm8, %zmm8
	valignq	$7, %zmm6, %zmm7, %zmm7
	valignq	$7, %zmm5, %zmm6, %zmm6
	valignq	$7, %zmm30, %zmm5, %zmm5

	# The last high multiplications
	vpmadd52huq	%zmm18, %zmm0, %zmm10
	vpmadd52huq	%zmm18, %zmm20, %zmm11
	vpmadd52huq	%zmm18, %zmm2, %zmm12
	vpmadd52huq	%zmm18, %zmm3, %zmm13
	vpmadd52huq	%zmm18, %zmm4, %zmm14

	vpmadd52huq	%zmm16, %zmm5, %zmm10
	vpmadd52huq	%zmm16, %zmm6, %zmm11
	vpmadd52huq	%zmm16, %zmm7, %zmm12
	vpmadd52huq	%zmm16, %zmm8, %zmm13
	vpmadd52huq	%zmm16, %zmm9, %zmm14

	# Now 'normalize' the result to 52 bit words
	vpsrlq	$52, %zmm10, %zmm0
	vpsrlq	$52, %zmm11, %zmm20
	vpsrlq	$52, %zmm12, %zmm2
	vpsrlq	$52, %zmm13, %zmm3
	vpsrlq	$52, %zmm14, %zmm4

	vpandq	%zmm31, %zmm10, %zmm10
	vpandq	%zmm31, %zmm11, %zmm11
	vpandq	%zmm31, %zmm12, %zmm12
	vpandq	%zmm31, %zmm13, %zmm13
	vpandq	%zmm31, %zmm14, %zmm14

	valignq	$7, %zmm3, %zmm4, %zmm4
	valignq	$7, %zmm2, %zmm3, %zmm3
	valignq	$7, %zmm20, %zmm2, %zmm2
	valignq	$7, %zmm0, %zmm20, %zmm20
	valignq	$7, %zmm30, %zmm0, %zmm0

	vpaddq	%zmm0, %zmm10, %zmm10
	vpaddq	%zmm20, %zmm11, %zmm11
	vpaddq	%zmm2, %zmm12, %zmm12
	vpaddq	%zmm3, %zmm13, %zmm13
	vpaddq	%zmm4, %zmm14, %zmm14

	vpcmpuq	$1, %zmm10, %zmm31, %k1
	vpcmpuq	$1, %zmm11, %zmm31, %k2
	vpcmpuq	$1, %zmm12, %zmm31, %k3
	vpcmpuq	$1, %zmm13, %zmm31, %k4
	vpcmpuq	$1, %zmm14, %zmm31, %k5

	kmovb	%k1, %eax
	kmovb	%k2, %ebx
	kmovb	%k3, %ecx
	kmovb	%k4, %r11d
	kmovb	%k5, %r12d

	vpcmpuq	$0, %zmm31, %zmm10, %k1
	vpcmpuq	$0, %zmm31, %zmm11, %k2
	vpcmpuq	$0, %zmm31, %zmm12, %k3
	vpcmpuq	$0, %zmm31, %zmm13, %k4
	vpcmpuq	$0, %zmm31, %zmm14, %k5

	kmovb	%k1, %r8d
	kmovb	%k2, %r9d
	kmovb	%k3, %r10d
	kmovb	%k4, %r14d
	kmovb	%k5, %r15d

	clc
	rcl	$1, %al
	rcl	$1, %bl
	rcl	$1, %cl
	rcl	$1, %r11b
	rcl	$1, %r12b

	add	%r8b, %al
	adc	%r9b, %bl
	adc	%r10b, %cl
	adc	%r14b, %r11b
	adc	%r15b, %r12b

	xor	%r8b, %al
	xor	%r9b, %bl
	xor	%r10b, %cl
	xor	%r14b, %r11b
	xor	%r15b, %r12b

	kmovb	%eax, %k1
	kmovb	%ebx, %k2
	kmovb	%ecx, %k3
	kmovb	%r11d, %k4
	kmovb	%r12d, %k5

	vpsubq	%zmm31, %zmm10, %zmm10{%k1}
	vpsubq	%zmm31, %zmm11, %zmm11{%k2}
	vpsubq	%zmm31, %zmm12, %zmm12{%k3}
	vpsubq	%zmm31, %zmm13, %zmm13{%k4}
	vpsubq	%zmm31, %zmm14, %zmm14{%k5}

	vpandq	%zmm31, %zmm10, %zmm10
	vpandq	%zmm31, %zmm11, %zmm11
	vpandq	%zmm31, %zmm12, %zmm12
	vpandq	%zmm31, %zmm13, %zmm13
	vpandq	%zmm31, %zmm14, %zmm14

	vmovdqu64	%zmm10, 64*0(%rdi)
	vmovdqu64	%zmm11, 64*1(%rdi)
	vmovdqu64	%zmm12, 64*2(%rdi)
	vmovdqu64	%zmm13, 64*3(%rdi)
	vmovdqu64	%zmm14, 64*4(%rdi)

	pop	%r15
	pop	%r14
	pop	%r13
	pop	%r12
	pop	%rbx
	ret
################################################################################
